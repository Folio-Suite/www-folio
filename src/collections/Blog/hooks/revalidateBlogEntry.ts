import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { BlogEntry } from '../../../payload-types'

export const revalidateBlogEntry: CollectionAfterChangeHook<BlogEntry> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    revalidateTag('global_header', { expire: 0 })
    revalidateTag('global_footer', { expire: 0 })
    revalidatePath('/blog', 'layout')
    revalidateTag('blog-content', 'max')
    revalidateTag('redirects', 'max')
    if (doc._status === 'published') {
      const path = `/blog/${doc.slug}`

      payload.logger.info(`Revalidating post at path: ${path}`)

      revalidatePath(path)
      revalidateTag('blog-sitemap', 'max')
    }

    // If the post was previously published, we need to revalidate the old path
    if (
      previousDoc._status === 'published' &&
      (doc._status !== 'published' || previousDoc.slug !== doc.slug)
    ) {
      const oldPath = `/blog/${previousDoc.slug}`

      payload.logger.info(`Revalidating old post at path: ${oldPath}`)

      revalidatePath(oldPath)
      revalidateTag('blog-sitemap', 'max')
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<BlogEntry> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) {
    revalidateTag('global_header', { expire: 0 })
    revalidateTag('global_footer', { expire: 0 })
    revalidatePath('/blog', 'layout')
    revalidateTag('blog-content', 'max')
    revalidateTag('redirects', 'max')
    const path = `/blog/${doc?.slug}`

    revalidatePath(path)
    revalidateTag('blog-sitemap', 'max')
  }

  return doc
}
