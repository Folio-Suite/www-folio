import { APIError, type CollectionBeforeChangeHook } from 'payload'

export const preservePermalinks: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const slug = data.slug || originalDoc?.slug
  if (!slug) return data
  const from = `/blog/${encodeURIComponent(slug)}`
  const existing = await req.payload.find({
    collection: 'redirects',
    where: { and: [{ site: { equals: 'product' } }, { from: { equals: from } }] },
    depth: 0,
    limit: 1,
    req,
  })
  const reservation = existing.docs[0]
  const reference = reservation?.to?.reference
  if (reservation && (reference?.relationTo !== 'blog' || reference.value !== originalDoc?.id)) {
    throw new APIError('This slug is reserved by an existing redirect. Choose another slug.', 400)
  }
  // A draft save must not move a currently published permalink.
  if (data._status !== 'published') return data
  if (reservation) await req.payload.delete({ collection: 'redirects', id: reservation.id, req })
  if (!originalDoc?.id) return data
  const published = await req.payload.findByID({
    collection: 'blog',
    id: originalDoc.id,
    draft: false,
    depth: 0,
    req,
    disableErrors: true,
  })
  if (published?._status === 'published' && published.slug && published.slug !== slug) {
    await req.payload.create({
      collection: 'redirects',
      req,
      data: {
        site: 'product',
        from: `/blog/${encodeURIComponent(published.slug)}`,
        to: { type: 'reference', reference: { relationTo: 'blog', value: published.id } },
      },
    })
  }
  return data
}
