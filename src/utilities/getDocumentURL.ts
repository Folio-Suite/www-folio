import { pageURL, type Site } from '@/sites/config'
import { getServerSideURL } from './getURL'

export function getDocumentURL(
  collection: 'blog' | 'pages',
  slug?: string | null,
  site?: Site | null,
): string {
  if (collection === 'pages') return pageURL(site || 'product', slug)
  const path =
    collection === 'blog'
      ? `/blog${slug ? `/${encodeURIComponent(slug)}` : ''}`
      : !slug || slug === 'home'
        ? '/'
        : `/${encodeURIComponent(slug)}`
  return new URL(path, getServerSideURL()).href
}
