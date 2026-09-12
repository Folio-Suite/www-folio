export const reservedPageSlugs = new Set([
  'sites',
  'admin',
  'api',
  'blog',
  'search',
  'next',
  'webmention',
  'feed.xml',
  'feed.atom',
  'feed.json',
  'sitemap.xml',
  'pages-sitemap.xml',
  'blog-sitemap.xml',
  'robots.txt',
  'favicon.svg',
  'favicon.ico',
  '_next',
])

export function isPageSlug(slug: string) {
  return Boolean(slug) && !reservedPageSlugs.has(slug) && !/[.%/?#\\]/.test(slug)
}

export function isEditorialPath(path: string) {
  if (path === '/') return true
  try {
    return isPageSlug(decodeURIComponent(path.replace(/^\//, '').replace(/\/$/, '')))
  } catch {
    return false
  }
}
