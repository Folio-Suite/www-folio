import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'
import { mf2 } from 'microformats-parser'
import config from '../../src/payload.config'
import { textContent } from '../helpers/content'

test('page and article metadata use editorial titles, media facts, and actual authors', async ({
  page,
}) => {
  const payload = await getPayload({ config, key: 'metadata.e2e.spec' })
  const context = { disableRevalidate: true }
  const first = await payload.create({
    collection: 'users',
    data: {
      name: 'First writer',
      twitterHandle: '@FirstWriter',
      email: 'first-meta@example.test',
      password: 'local-test-password',
    },
  })
  const second = await payload.create({
    collection: 'users',
    data: {
      name: 'Second writer',
      twitterHandle: '@SecondWriter',
      email: 'second-meta@example.test',
      password: 'local-test-password',
    },
  })
  const data = await sharp({
    create: { width: 1800, height: 1000, channels: 3, background: '#88aacc' },
  })
    .jpeg()
    .toBuffer()
  const image = await payload.create({
    collection: 'media',
    data: { alt: 'Blue horizon' },
    file: { data, size: data.length, name: 'metadata-photo.jpg', mimetype: 'image/jpeg' },
  })
  const article = await payload.create({
    collection: 'blog',
    context,
    data: {
      title: 'Shared work',
      slug: 'shared-work',
      content: textContent('Public writing.'),
      authors: [first.id, second.id],
      _status: 'published',
      meta: {
        title: 'An editorial title <with care>',
        description: 'An editorial description',
        image: image.id,
      },
    },
  })
  const document = await payload.create({
    collection: 'pages',
    context,
    data: {
      title: 'About',
      slug: 'metadata-about',
      hero: { type: 'none' },
      layout: [{ blockType: 'content', columns: [] }],
      meta: { image: image.id },
      _status: 'published',
    },
  })
  try {
    await page.goto(`http://localhost:3000/blog/${article.slug}`)
    await expect(page).toHaveTitle('An editorial title <with care>')
    await expect(page.locator('meta[name="twitter:creator"]')).toHaveAttribute(
      'content',
      '@FirstWriter',
    )
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630')
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      'content',
      'Blue horizon',
    )
    const schema = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) || '{}',
    )
    expect(schema.headline).toBe('An editorial title <with care>')
    expect(schema.author.map((author: { name: string }) => author.name)).toEqual([
      'First writer',
      'Second writer',
    ])
    const entry = mf2(await page.content(), { baseUrl: page.url() }).items.find((item) =>
      item.type?.includes('h-entry'),
    )
    expect(entry?.properties.author).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({ name: ['First writer'] }),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({ name: ['Second writer'] }),
        }),
      ]),
    )
    expect(schema.image).toMatch(/^http:\/\/localhost:3000\/api\/media\/file\//)
    expect(await page.content()).not.toContain(first.email)
    await payload.update({
      collection: 'users',
      id: first.id,
      context,
      data: { twitterHandle: '' },
    })
    await page.reload()
    await expect(page.locator('meta[name="twitter:creator"]')).toHaveCount(0)
    await page.goto('http://localhost:3000/metadata-about')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', schema.image)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:3000/metadata-about',
    )
  } finally {
    await payload.delete({ collection: 'pages', id: document.id, context })
    await payload.delete({ collection: 'blog', id: article.id, context })
    await payload.delete({ collection: 'media', id: image.id })
    await payload.delete({ collection: 'users', where: { id: { in: [first.id, second.id] } } })
    await payload.destroy()
  }
})
