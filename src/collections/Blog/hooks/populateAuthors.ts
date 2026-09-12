import type { CollectionAfterReadHook } from 'payload'

// Deliberately project only public fields. Never serialize user account objects.
export const populateAuthors: CollectionAfterReadHook = async ({ doc, req }) => {
  doc.populatedAuthors = []
  for (const author of doc.authors || []) {
    const id = typeof author === 'object' ? author?.id : author
    if (!id) continue
    const user = await req.payload.findByID({
      collection: 'users',
      id,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      select: { name: true, twitterHandle: true },
      req,
    })
    if (user)
      doc.populatedAuthors.push({
        id: String(user.id),
        name: user.name,
        twitterHandle: user.twitterHandle,
      })
  }
  doc.authors = (doc.authors || []).map((author: number | { id: number }) =>
    typeof author === 'object' ? author.id : author,
  )
  return doc
}
