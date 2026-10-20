// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { type NextRequest } from 'next/server'
import { resolveSite } from '../../../sites/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
}
const missing = () => new Response('Not found', { status: 404 })

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const destination = resolveSite(
    request.headers.get('host'),
    request.nextUrl.searchParams.get('site') || request.cookies.get('folio-site')?.value,
  )
  if (!destination) return new Response('Unknown Folio host', { status: 421 })
  if (destination.site !== 'development') return missing()
  const segments = (await context.params).path || []
  if (
    segments.some(
      (segment) => !segment || segment === '.' || segment === '..' || /[%/\\\x00]/.test(segment),
    )
  )
    return missing()
  if (segments[0] === 'latest') {
    const target = request.nextUrl.clone()
    target.pathname = `/UndoKit/${segments.slice(1).join('/')}`
    return Response.redirect(target, 308)
  }
  let root =
    process.env.FOLIO_DOCUMENTATION_ROOT || path.join(process.cwd(), 'documentation/undokit')
  let relative: string
  let mount = '/UndoKit/'
  if (segments[0] === '_folio') {
    if (segments.length !== 2 || !['selector.js', 'selector.css'].includes(segments[1]))
      return missing()
    root = path.join(process.cwd(), 'src/documentation/assets')
    relative = segments[1]
  } else if (segments.join('/') === 'publication.json') {
    relative = 'publication.json'
  } else {
    let topic = segments
    let site = 'latest'
    if (segments[0] === 'versions') {
      if (!/^\d+\.\d+\.\d+$/.test(segments[1] || '')) return missing()
      site = `versions/${segments[1]}`
      mount += `${site}/`
      topic = segments.slice(2)
    }
    if (!topic.length) {
      try {
        await stat(path.join(root, site, 'site/documentation/undokit/index.html'))
      } catch {
        return missing()
      }
      const target = request.nextUrl.clone()
      target.pathname = `${mount}documentation/undokit/`
      return Response.redirect(target, 307)
    }
    root = path.join(root, site, 'site')
    relative = topic.join('/')
  }
  try {
    const realRoot = await realpath(root)
    let file = path.join(realRoot, relative)
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
    file = await realpath(file)
    if (!file.startsWith(`${realRoot}${path.sep}`)) return missing()
    const bytes = await readFile(file)
    const headers = new Headers({
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': destination.previewHost
        ? 'private, no-store'
        : 'public, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      ETag: `"${createHash('sha256').update(bytes).digest('hex')}"`,
    })
    if (destination.previewHost) headers.set('X-Robots-Tag', 'noindex, nofollow')
    if (request.headers.get('if-none-match') === headers.get('etag'))
      return new Response(null, { status: 304, headers })
    return new Response(bytes, { headers })
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code || ''))
      return missing()
    throw error
  }
}
