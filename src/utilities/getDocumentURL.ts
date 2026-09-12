import { getServerSideURL } from './getURL'

export function getDocumentURL(collection: 'blog' | 'pages', slug?: string | null): string {
  const path =
    collection === 'blog'
      ? `/blog${slug ? `/${encodeURIComponent(slug)}` : ''}`
      : !slug || slug === 'home'
        ? '/'
        : `/${encodeURIComponent(slug)}`
  return new URL(path, getServerSideURL()).href
}
