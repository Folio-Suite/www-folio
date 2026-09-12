import { getPayload } from 'payload'
import config from '@payload-config'

export async function References({ target }: { target: number }) {
  const payload = await getPayload({ config })
  const mentions = await payload.find({
    collection: 'webmentions',
    overrideAccess: true,
    depth: 0,
    limit: 100,
    sort: 'createdAt',
    where: {
      and: [
        { target: { equals: target } },
        { verification: { equals: 'verified' } },
        { moderation: { equals: 'approved' } },
      ],
    },
    select: { source: true, sourceTitle: true },
  })
  if (!mentions.totalDocs) return null
  return (
    <section className="mt-12" aria-label="References">
      <h2 className="text-2xl mb-4">References</h2>
      <ul>
        {mentions.docs.map((mention) => (
          <li key={mention.id}>
            <a href={mention.source} rel="nofollow ugc noreferrer">
              {mention.sourceTitle || new URL(mention.source).hostname}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
