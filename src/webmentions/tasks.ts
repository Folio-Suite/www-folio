import { load } from 'cheerio'
import type { TaskConfig } from 'payload'
import { fetchPublicURL } from './network'
import { fingerprint } from './receive'
import { getDocumentURL } from '@/utilities/getDocumentURL'

export const verifyWebmention: TaskConfig<{
  input: { id: number }
  output: Record<string, never>
}> = {
  slug: 'verifyWebmention',
  inputSchema: [{ name: 'id', type: 'number', required: true }],
  retries: { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
  concurrency: ({ input }) => `verify-webmention-${input.id}`,
  handler: async ({ input, req }) => {
    const payload = req.payload
    const context = { disableRevalidate: true }
    const mention = await payload.findByID({
      collection: 'webmentions',
      id: input.id,
      depth: 0,
      disableErrors: true,
    })
    if (!mention) return { output: {} }
    try {
      const targetID = typeof mention.target === 'object' ? mention.target.id : mention.target
      const target = await payload.findByID({
        collection: 'blog',
        id: targetID,
        overrideAccess: false,
        draft: false,
        disableErrors: true,
      })
      if (!target) {
        await payload.update({
          collection: 'webmentions',
          id: mention.id,
          context,
          data: { verification: 'invalid', error: 'Target is no longer public.' },
        })
        return { output: {} }
      }
      const response = await fetchPublicURL(mention.source)
      if (response.status === 429 || response.status >= 500)
        throw new Error(`Source returned HTTP ${response.status}.`)
      const $ = load(response.text)
      const targetURL = getDocumentURL('blog', target.slug)
      const links = $('a[href],link[href]')
        .toArray()
        .map((element) => {
          try {
            const url = new URL($(element).attr('href') || '', response.url)
            url.hash = ''
            return url.href
          } catch {
            return ''
          }
        })
      const verified =
        response.status >= 200 &&
        response.status < 300 &&
        /text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '') &&
        links.includes(targetURL)
      const hash = fingerprint(response.text)
      await payload.update({
        collection: 'webmentions',
        id: mention.id,
        context,
        data: {
          verification: verified ? 'verified' : 'invalid',
          error: verified ? '' : 'Source no longer contains a link to the public target.',
          sourceTitle:
            $('title').first().text().trim().slice(0, 300) || new URL(mention.source).hostname,
          fingerprint: hash,
          moderation: hash === mention.fingerprint ? mention.moderation : 'pending',
        },
      })
      return { output: {} }
    } catch (error) {
      await payload.update({
        collection: 'webmentions',
        id: mention.id,
        context,
        data: {
          verification: 'error',
          error: error instanceof Error ? error.message : 'Verification failed.',
        },
      })
      throw error
    }
  },
}
