// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import type { APIRoute } from 'astro'
import rss from '@astrojs/rss'
import { publishedPosts } from '../lib/blog'
export const GET: APIRoute = async ({ site }) =>
  rss({
    title: 'Folio Suite Development',
    description: 'Notes from work on Folio Suite.',
    site: site!,
    customData: '<language>en</language>',
    items: (await publishedPosts()).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
  })
