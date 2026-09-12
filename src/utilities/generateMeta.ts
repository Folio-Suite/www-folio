import type { Metadata } from 'next'
import type { Page, BlogEntry } from '../payload-types'
import { mergeOpenGraph } from './mergeOpenGraph'
import { getDocumentURL } from './getDocumentURL'
import { siteDescription } from './site'
import { documentTitle, sharingImage } from './publishingMetadata'

export const generateMeta = async ({
  doc,
  collection = 'pages',
}: {
  doc: Partial<Page> | Partial<BlogEntry> | null
  collection?: 'blog' | 'pages'
}): Promise<Metadata> => {
  const image = sharingImage(doc)
  const title = documentTitle(doc)
  const description = doc?.meta?.description || siteDescription
  const url = getDocumentURL(collection, doc?.slug)
  const authors = doc && 'populatedAuthors' in doc ? doc.populatedAuthors || [] : []
  // Twitter cards support one creator. Use the first assigned author's handle;
  // do not silently attribute their work to a later coauthor or the site owner.
  const creator = authors[0]?.twitterHandle || undefined
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: mergeOpenGraph({
      title,
      description,
      url,
      images: image ? [image] : [],
      ...(collection === 'blog'
        ? {
            type: 'article' as const,
            publishedTime: doc?.publishedAt || undefined,
            modifiedTime: doc?.updatedAt || undefined,
            authors: authors.flatMap((author) =>
              author.twitterHandle ? [`https://x.com/${author.twitterHandle.slice(1)}`] : [],
            ),
          }
        : { type: 'website' as const }),
    }),
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      creator,
      title,
      description,
      images: image ? [{ url: image.url, alt: image.alt }] : [],
    },
  }
}
