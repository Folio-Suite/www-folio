// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import type { APIRoute } from 'astro'
import { publishedPosts, escapeXML as x } from '../lib/blog'
export const GET: APIRoute = async () => {
  const items = (await publishedPosts())
    .map(
      (post) =>
        `<item><title>${x(post.data.title)}</title><link>https://foliosuite.dev/blog/${x(post.id)}/</link><guid>https://foliosuite.dev/blog/${x(post.id)}/</guid><pubDate>${post.data.pubDate.toUTCString()}</pubDate><description>${x(post.data.description)}</description></item>`,
    )
    .join('')
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Folio Suite Development</title><link>https://foliosuite.dev/blog/</link><description>Notes from work on Folio Suite.</description><language>en</language>${items}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  )
}
