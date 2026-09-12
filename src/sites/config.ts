export const sites = {
  product: {
    name: 'Folio Suite',
    label: 'Product',
    origin: 'https://foliosuite.app',
    description: 'Folio Suite: tools for writing, research, and publishing.',
  },
  development: {
    name: 'Folio Suite Development',
    label: 'Development',
    origin: 'https://foliosuite.dev',
    description: 'Development notes, specifications, and technical documentation for Folio Suite.',
  },
} as const

export type Site = keyof typeof sites
export const isSite = (value: unknown): value is Site =>
  value === 'product' || value === 'development'

export function resolveSite(host: string | null, selected?: string | null) {
  const hostname = (host || '').toLowerCase().split(':')[0]
  for (const site of Object.keys(sites) as Site[]) {
    const domain = new URL(sites[site].origin).hostname
    if (hostname === domain || hostname === `www.${domain}`) return { site, previewHost: false }
  }
  const previewHosts = [
    'localhost',
    '127.0.0.1',
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean)
  if (previewHosts.includes(hostname)) {
    return { site: isSite(selected) ? selected : ('product' as Site), previewHost: true }
  }
  return null
}

export function pagePath(slug?: string | null) {
  return !slug || slug === 'home' ? '/' : `/${encodeURIComponent(slug)}`
}

export function pageURL(site: Site, slug?: string | null) {
  return new URL(pagePath(slug), sites[site].origin).href
}
