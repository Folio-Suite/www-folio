import { load } from 'cheerio'
import { after } from 'next/server'
import type {
  CollectionAfterChangeHook,
  CollectionBeforeDeleteHook,
  PayloadRequest,
  TaskConfig,
} from 'payload'
import type { BlogEntry } from '@/payload-types'
import { renderContent } from '@/blog/content'
import { getServerSideURL } from '@/utilities/getURL'
import { getDocumentURL } from '@/utilities/getDocumentURL'
import { fingerprint } from './receive'
import { publicURL, fetchPublicURL } from './network'

export function wakeWebmentions(req: PayloadRequest) {
  if (!req.context.disableRevalidate && process.env.NEXT_RUNTIME)
    after(async () => {
      await req.payload.jobs.run({ limit: 3 })
    })
}

export const queueWebmentions: CollectionAfterChangeHook<BlogEntry> = async ({ doc, req }) => {
  if (
    doc._status !== 'published' ||
    !doc.slug ||
    (doc.publishedAt && Date.parse(doc.publishedAt) > Date.now())
  )
    return doc
  const source = getDocumentURL('blog', doc.slug)
  const $ = load(renderContent(doc.content))
  const targets = [
    ...new Set(
      $('a[href]')
        .toArray()
        .flatMap((element) => {
          try {
            const url = publicURL($(element).attr('href') || '')
            return url.origin === getServerSideURL() ? [] : [url.href]
          } catch {
            return []
          }
        }),
    ),
  ]
    .sort()
    .slice(0, 50)
  const hash = fingerprint(JSON.stringify({ source, targets }))
  const previous = (
    await req.payload.find({
      collection: 'webmention-publications',
      where: { entry: { equals: doc.id } },
      limit: 1,
      depth: 0,
      req,
    })
  ).docs[0]
  if (previous?.fingerprint === hash) return doc
  const revision = (previous?.revision || 0) + 1
  const previousTargets = Array.isArray(previous?.targets)
    ? previous.targets.filter((value): value is string => typeof value === 'string')
    : []
  const publication = { entry: doc.id, fingerprint: hash, revision, targets }
  if (previous)
    await req.payload.update({
      collection: 'webmention-publications',
      id: previous.id,
      data: publication,
      req,
    })
  else await req.payload.create({ collection: 'webmention-publications', data: publication, req })
  for (const target of new Set([...targets, ...previousTargets])) {
    const delivery = await req.payload.create({
      collection: 'webmention-deliveries',
      req,
      data: {
        key: fingerprint(`${doc.id}:${revision}:${target}`),
        entry: doc.id,
        source,
        target,
        state: 'pending',
        attempts: 0,
      },
    })
    await req.payload.jobs.queue({ task: 'sendWebmention', input: { id: delivery.id }, req })
  }
  if (targets.length || previousTargets.length) wakeWebmentions(req)
  return doc
}

export const deleteWebmentions: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const mentions = await req.payload.find({
    collection: 'webmentions',
    where: { target: { equals: id } },
    depth: 0,
    pagination: false,
    req,
  })
  const deliveries = await req.payload.find({
    collection: 'webmention-deliveries',
    where: { entry: { equals: id } },
    depth: 0,
    pagination: false,
    req,
  })
  const keys = [
    ...mentions.docs.map((mention) => `verify-webmention-${mention.id}`),
    ...deliveries.docs.map((delivery) => `send-webmention-${delivery.id}`),
  ]
  if (keys.length)
    await req.payload.delete({
      collection: 'payload-jobs',
      where: { concurrencyKey: { in: keys } },
      req,
    })
  await req.payload.delete({ collection: 'webmentions', where: { target: { equals: id } }, req })
  await req.payload.delete({
    collection: 'webmention-deliveries',
    where: { entry: { equals: id } },
    req,
  })
  await req.payload.delete({
    collection: 'webmention-publications',
    where: { entry: { equals: id } },
    req,
  })
}

export const sendWebmention: TaskConfig<{ input: { id: number }; output: Record<string, never> }> =
  {
    slug: 'sendWebmention',
    inputSchema: [{ name: 'id', type: 'number', required: true }],
    retries: { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    concurrency: ({ input }) => `send-webmention-${input.id}`,
    handler: async ({ input, req }) => {
      const payload = req.payload
      const delivery = await payload.findByID({
        collection: 'webmention-deliveries',
        id: input.id,
        depth: 0,
        disableErrors: true,
      })
      if (!delivery || ['sent', 'no-endpoint', 'canceled'].includes(delivery.state))
        return { output: {} }
      const entryID = typeof delivery.entry === 'object' ? delivery.entry.id : delivery.entry
      const entry = await payload.findByID({
        collection: 'blog',
        id: entryID,
        draft: false,
        overrideAccess: false,
        disableErrors: true,
      })
      if (!entry) {
        await payload.update({
          collection: 'webmention-deliveries',
          id: delivery.id,
          data: { state: 'canceled', error: 'Entry is not public.' },
        })
        return { output: {} }
      }
      const source = getDocumentURL('blog', entry.slug)
      await payload.update({
        collection: 'webmention-deliveries',
        id: delivery.id,
        data: { state: 'pending', attempts: (delivery.attempts || 0) + 1, source },
      })
      try {
        const page = await fetchPublicURL(delivery.target)
        if (page.status === 429 || page.status >= 500)
          throw new Error(`Recipient returned HTTP ${page.status}.`)
        const $ = load(page.text)
        const headerEndpoint =
          /<([^>]+)>\s*;[^,]*\brel\s*=\s*(?:"[^"]*\bwebmention\b[^"]*"|webmention\b)/i.exec(
            page.headers.get('link') || '',
          )?.[1]
        const htmlEndpoint = /text\/html|application\/xhtml\+xml/i.test(
          page.headers.get('content-type') || '',
        )
          ? $('link[rel~="webmention"][href],a[rel~="webmention"][href]').first().attr('href')
          : undefined
        const discovered = headerEndpoint || htmlEndpoint
        if (page.status < 200 || page.status >= 300 || !discovered) {
          await payload.update({
            collection: 'webmention-deliveries',
            id: delivery.id,
            data: { state: 'no-endpoint', error: '' },
          })
          return { output: {} }
        }
        const endpoint = publicURL(new URL(discovered, page.url).href).href
        const response = await fetchPublicURL(endpoint, {
          body: new URLSearchParams({ source, target: delivery.target }).toString(),
        })
        if (response.status < 200 || response.status >= 300)
          throw new Error(`Webmention endpoint returned HTTP ${response.status}.`)
        await payload.update({
          collection: 'webmention-deliveries',
          id: delivery.id,
          data: { state: 'sent', endpoint, error: '' },
        })
        return { output: {} }
      } catch (error) {
        await payload.update({
          collection: 'webmention-deliveries',
          id: delivery.id,
          data: {
            state: 'failed',
            error: error instanceof Error ? error.message : 'Delivery failed.',
          },
        })
        throw error
      }
    },
  }
