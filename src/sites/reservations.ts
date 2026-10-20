import { APIError, type CollectionBeforeChangeHook } from 'payload'
import { reservedPageSlugs, isPageSlug } from './paths'
import { pagePath, sites, type Site } from './config'

export const reservePagePath: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const slug = data.slug ?? originalDoc?.slug
  const site = data.site ?? originalDoc?.site ?? 'product'
  if (!slug) return data
  if (!isPageSlug(slug)) {
    throw new APIError('This page path is reserved by the website.', 400)
  }
  const redirects = await req.payload.find({
    collection: 'redirects',
    req,
    depth: 0,
    limit: 1,
    where: { and: [{ site: { equals: site } }, { from: { equals: pagePath(slug) } }] },
  })
  if (redirects.totalDocs)
    throw new APIError('This page path is reserved by a redirect on this site.', 400)
  return data
}

export const reserveRedirectPath: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const from = data.from ?? originalDoc?.from
  const site = data.site ?? originalDoc?.site ?? 'product'
  const to = data.to ?? originalDoc?.to
  if (
    !from?.startsWith('/') ||
    from.includes('//') ||
    (from.length > 1 && from.endsWith('/')) ||
    /[?#\\]/.test(from) ||
    new URL(from, 'https://example.test').pathname !== from
  ) {
    throw new APIError('Use a normalized relative path for the redirect source.', 400)
  }
  const segments = from.slice(1).split('/')
  if (segments[0] === 'blog' && segments.length > 2)
    throw new APIError('This redirect source is reserved by Blog routing.', 400)
  let slug: string
  try {
    slug = from === '/' ? 'home' : decodeURIComponent(from.slice(1))
  } catch {
    throw new APIError('Use a valid encoded redirect path.', 400)
  }
  if (['api', 'admin', 'next', '_next', 'sites', 'UndoKit'].includes(slug.split('/')[0]))
    throw new APIError('This redirect source is reserved by the website.', 400)
  if (reservedPageSlugs.has(slug)) throw new APIError('This path is reserved by the website.', 400)
  const pages = await req.payload.find({
    collection: 'pages',
    req,
    depth: 0,
    limit: 1,
    where: { and: [{ site: { equals: site } }, { slug: { equals: slug } }] },
  })
  if (pages.totalDocs) throw new APIError('This path is reserved by a page on this site.', 400)
  if (to?.type === 'custom' && to.url) {
    let target: URL
    try {
      target = new URL(to.url, sites[site as Site].origin)
    } catch {
      throw new APIError('Use a valid redirect destination.', 400)
    }
    if (!['https:', 'http:'].includes(target.protocol) || to.url.startsWith('//'))
      throw new APIError('Use an HTTP(S) URL or a relative destination.', 400)
    const seen = new Set([`${sites[site as Site].origin}${from}`])
    for (let hop = 0; hop < 20; hop++) {
      const key = `${target.origin}${target.pathname}`
      if (seen.has(key)) throw new APIError('This redirect would create a loop.', 400)
      seen.add(key)
      const targetSite = Object.entries(sites).find(
        ([, value]) => value.origin === target.origin,
      )?.[0]
      if (!targetSite) break
      const next = (
        await req.payload.find({
          collection: 'redirects',
          req,
          depth: 0,
          limit: 1,
          where: { and: [{ site: { equals: targetSite } }, { from: { equals: target.pathname } }] },
        })
      ).docs[0]
      if (next?.id === originalDoc?.id || !next || next.to?.type !== 'custom' || !next.to.url) break
      target = new URL(next.to.url, target.origin)
      if (hop === 19) throw new APIError('This redirect chain is too long.', 400)
    }
  }
  if (to?.type === 'reference' && to.reference?.relationTo === 'pages') {
    const value = to.reference.value
    const doc = await req.payload.findByID({
      collection: 'pages',
      id: typeof value === 'object' ? value.id : value,
      req,
      depth: 0,
    })
    if (doc.site === site && pagePath(doc.slug) === from)
      throw new APIError('This redirect would create a loop.', 400)
  }
  return data
}
