// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import type { APIRoute } from 'astro'
import { publishedPosts, escapeXML as x } from '../lib/blog'
import publication from '../../documentation/undokit/publication.json'
export const GET: APIRoute = async () => {
  const paths = [
    '/',
    '/about/',
    '/blog/',
    '/documentation/',
    '/UndoKit/',
    ...publication.versions.map((v) => v.basePath),
    ...(await publishedPosts()).map((post) => `/blog/${post.id}/`),
  ]
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>https://foliosuite.dev${x(p)}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  )
}
