import { NextResponse, type NextRequest } from 'next/server'
import { isEditorialPath } from './sites/paths'
import { isSite, resolveSite } from './sites/config'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/sites' || request.nextUrl.pathname.startsWith('/sites/')) {
    return new NextResponse('Not found', { status: 404 })
  }
  const selected =
    request.nextUrl.searchParams.get('site') || request.cookies.get('folio-site')?.value
  const destination = resolveSite(request.headers.get('host'), selected)
  if (!destination) return new NextResponse('Unknown Folio host', { status: 421 })
  if (destination.previewHost && request.nextUrl.searchParams.has('site') && !isSite(selected)) {
    return new NextResponse('Unknown Folio destination', { status: 400 })
  }
  const headers = new Headers(request.headers)
  if (destination.previewHost && isSite(selected)) {
    request.cookies.set('folio-site', selected)
    headers.set('cookie', request.cookies.toString())
  }
  const path = request.nextUrl.pathname
  const isPage = isEditorialPath(path)
  const destinationURL = request.nextUrl.clone()
  destinationURL.pathname = `/sites/${destination.site}${path === '/' ? '' : path}`
  const response = isPage
    ? NextResponse.rewrite(destinationURL, { request: { headers } })
    : NextResponse.next({ request: { headers } })
  if (destination.previewHost || request.cookies.has('folio-preview')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    response.headers.set('Cache-Control', 'private, no-store')
    if (isSite(selected))
      response.cookies.set('folio-site', selected, { httpOnly: true, sameSite: 'lax', path: '/' })
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.svg$|favicon\\.ico$|api/media/file).*)'],
}
