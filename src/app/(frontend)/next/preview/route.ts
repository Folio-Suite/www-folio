import { getPayload } from 'payload'
import { cookies, draftMode } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'
import { pagePath, resolveSite, sites } from '@/sites/config'
import { readPreview, signPreview } from '@/sites/preview'

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config })
  const params = req.nextUrl.searchParams
  const host = req.headers.get('host')
  const destination = resolveSite(host, req.cookies.get('folio-site')?.value)
  if (!destination) return new Response('Unknown host', { status: 421 })
  const token = params.get('token')
  if (!token) {
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return new Response('Sign in to preview this document.', { status: 403 })
    const collection = params.get('collection')
    const id = Number(params.get('id'))
    if (!['pages', 'blog'].includes(collection || '') || !Number.isInteger(id) || id <= 0) {
      return new Response('Invalid preview document.', { status: 400 })
    }
    const doc = await payload.findByID({
      collection: collection === 'pages' ? 'pages' : 'blog',
      id,
      draft: true,
      user,
      overrideAccess: false,
      depth: 0,
      disableErrors: true,
    })
    if (!doc?.slug) return new Response('Document not found.', { status: 404 })
    const site = 'site' in doc ? doc.site : 'product'
    const protocol = req.nextUrl.protocol
    const editorOrigin = new URL(`${protocol}//${host}`).origin
    const grant = signPreview({
      site,
      collection: collection === 'pages' ? 'pages' : 'blog',
      slug: doc.slug,
      documentID: doc.id,
      userID: user.id,
      editorOrigin,
      expires: Date.now() + 15 * 60 * 1000,
    })
    const target = new URL(
      '/next/preview',
      destination.previewHost ? editorOrigin : sites[site].origin,
    )
    target.searchParams.set('token', grant)
    target.searchParams.set('site', site)
    return NextResponse.redirect(target, {
      headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    })
  }
  const grant = readPreview(token)
  if (!grant || (!destination.previewHost && grant.site !== destination.site))
    return new Response('Invalid or expired preview.', { status: 403 })
  const user = await payload.findByID({
    collection: 'users',
    id: grant.userID,
    disableErrors: true,
    depth: 0,
  })
  if (!user) return new Response('Preview author no longer exists.', { status: 403 })
  const secure = req.nextUrl.protocol === 'https:'
  const jar = await cookies()
  jar.set('folio-preview', token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    partitioned: secure,
    path: '/',
    maxAge: 900,
  })
  if (destination.previewHost)
    jar.set('folio-site', grant.site, { httpOnly: true, sameSite: 'lax', path: '/' })
  ;(await draftMode()).enable()
  const path =
    grant.collection === 'pages' ? pagePath(grant.slug) : `/blog/${encodeURIComponent(grant.slug)}`
  const target = new URL(
    path,
    destination.previewHost ? `${req.nextUrl.protocol}//${host}` : sites[grant.site].origin,
  )
  if (destination.previewHost) target.searchParams.set('site', grant.site)
  return NextResponse.redirect(target, {
    headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
  })
}
