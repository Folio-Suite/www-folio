import { createHash } from 'node:crypto'
import { APIError, createLocalReq, type Payload } from 'payload'
import { sql } from '@payloadcms/db-vercel-postgres'
import { getServerSideURL } from '@/utilities/getURL'
import { publishedBlogWhere } from '@/blog/published'
import { publicURL } from './network'

export const fingerprint = (value: string) => createHash('sha256').update(value).digest('hex')

export async function receiveWebmention(
  payload: Payload,
  sourceValue: string,
  targetValue: string,
  ip: string,
) {
  let source: string
  let target: URL
  try {
    source = publicURL(sourceValue).href
    target = new URL(targetValue)
  } catch {
    throw new APIError('Use a public HTTP or HTTPS source and a valid target URL.', 400)
  }
  target.hash = ''
  if (
    target.origin !== getServerSideURL() ||
    !/^\/blog\/[^/]+$/.test(target.pathname) ||
    source === target.href ||
    target.search
  )
    throw new APIError('Target must be a public blog entry on this site.', 400)
  let slug: string
  try {
    slug = decodeURIComponent(target.pathname.slice(6))
  } catch {
    throw new APIError('Target URL has invalid encoding.', 400)
  }
  const entry = (
    await payload.find({
      collection: 'blog',
      overrideAccess: false,
      draft: false,
      limit: 1,
      where: {
        and: [publishedBlogWhere(), { slug: { equals: slug } }],
      },
    })
  ).docs[0]
  if (!entry) throw new APIError('Target does not accept Webmentions.', 400)
  const hour = Math.floor(Date.now() / 3600000)
  for (const [identity, maximum] of [
    [fingerprint(`${payload.secret}:${ip}`), 20],
    ['global', 200],
  ] as const) {
    const bucket = `${hour}:${identity}`
    const result = await payload.db.drizzle.execute(
      sql`INSERT INTO webmention_limits (bucket, count) VALUES (${bucket}, 1) ON CONFLICT (bucket) DO UPDATE SET count = webmention_limits.count + 1 RETURNING count`,
    )
    if (Number(result.rows[0]?.count) > maximum)
      throw new APIError('Submission limit reached. Try again later.', 429)
  }
  await payload.db.drizzle.execute(
    sql`DELETE FROM webmention_limits WHERE created_at < NOW() - INTERVAL '2 days'`,
  )
  const key = fingerprint(`${source}\n${entry.id}`)
  const transactionID = await payload.db.beginTransaction()
  const req = await createLocalReq({ context: { disableRevalidate: true } }, payload)
  req.transactionID = transactionID || undefined
  try {
    const existing = (
      await payload.find({
        collection: 'webmentions',
        where: { key: { equals: key } },
        limit: 1,
        req,
      })
    ).docs[0]
    const mention = existing
      ? await payload.update({
          collection: 'webmentions',
          id: existing.id,
          // Keep the last verified result and moderation decision until the worker
          // has evidence that the source changed or no longer links to the entry.
          data: { error: '' },
          req,
        })
      : await payload.create({
          collection: 'webmentions',
          data: { key, source, target: entry.id, verification: 'pending', moderation: 'pending' },
          req,
        })
    await payload.jobs.queue({ task: 'verifyWebmention', input: { id: mention.id }, req })
    if (transactionID) await payload.db.commitTransaction(transactionID)
    return mention.id
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}
