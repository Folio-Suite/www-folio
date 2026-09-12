import type { BlogEntry, Media, Page } from '@/payload-types'
import { getDocumentURL } from './getDocumentURL'
import { getServerSideURL } from './getURL'
import { siteDescription, siteName } from './site'

type Document = Partial<Page> | Partial<BlogEntry>
export const documentTitle = (doc: Document | null) =>
  doc?.meta?.title &&
  !['Payload Website Template', `${doc.title} | Payload Website Template`].includes(doc.meta.title)
    ? doc.meta.title
    : doc?.title
      ? `${doc.title} | ${siteName}`
      : siteName

const mediaObject = (value: Media | number | null | undefined) =>
  value && typeof value === 'object' ? value : undefined
export const sharingImage = (doc: Document | null) => {
  const selected =
    mediaObject(doc?.meta?.image) ||
    (doc && 'heroImage' in doc ? mediaObject(doc.heroImage) : undefined)
  const image = selected?.mimeType?.startsWith('video/') ? mediaObject(selected.poster) : selected
  if (!image?.mimeType?.startsWith('image/')) return undefined
  const crop = image.sizes?.og?.url ? image.sizes.og : image
  if (!crop.url) return undefined
  return {
    url: new URL(crop.url, getServerSideURL()).href,
    width: crop.width || undefined,
    height: crop.height || undefined,
    type: crop.mimeType || undefined,
    alt: image.alt || image.description || image.title || undefined,
  }
}

export const articleSchema = (doc: BlogEntry) => {
  const image = sharingImage(doc)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${getServerSideURL()}/blog#entry-${doc.id}`,
    headline: documentTitle(doc),
    description: doc.meta?.description || siteDescription,
    url: getDocumentURL('blog', doc.slug),
    mainEntityOfPage: getDocumentURL('blog', doc.slug),
    datePublished: doc.publishedAt || undefined,
    dateModified: doc.updatedAt || undefined,
    image: image?.url,
    author: doc.populatedAuthors
      ?.filter((author) => author.name)
      .map((author) => ({
        '@type': 'Person',
        name: author.name,
        sameAs: author.twitterHandle ? `https://x.com/${author.twitterHandle.slice(1)}` : undefined,
      })),
  }
}

// Only assert facts the editor supplied or the upload verified.
export const videoSchema = (media: Media) => {
  if (!media.mimeType?.startsWith('video/') || !media.url) return undefined
  const poster = mediaObject(media.poster)
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: media.title || undefined,
    description: media.description || undefined,
    contentUrl: new URL(media.url, getServerSideURL()).href,
    thumbnailUrl: poster?.url ? new URL(poster.url, getServerSideURL()).href : undefined,
    encodingFormat: media.mimeType,
    width: media.width || undefined,
    height: media.height || undefined,
  }
}

export const serializeSchema = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')
