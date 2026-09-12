import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import { mf2 } from 'microformats-parser'
import config from '../../src/payload.config'

test('a published blog entry is discoverable at its new public address', async ({ page }) => {
  const payload = await getPayload({ config, key: 'blog.e2e.spec' })
  const removeFixtureRedirects = () =>
    payload.delete({
      collection: 'redirects',
      context: { disableRevalidate: true },
      where: {
        from: {
          in: [
            '/blog/the-first-real-entry',
            '/blog/caf%C3%A9-first',
            '/blog/café-first',
            '/blog/caf%C3%A9-final',
            '/blog/café-final',
          ],
        },
      },
    })
  await removeFixtureRedirects()
  const entry = await payload.create({
    collection: 'blog',
    context: { disableRevalidate: true },
    data: {
      title: 'The first real entry',
      slug: 'the-first-real-entry',
      _status: 'published',
      content: {
        root: {
          type: 'root',
          version: 1,
          direction: 'ltr',
          format: '',
          indent: 0,
          children: [
            {
              type: 'paragraph',
              version: 1,
              direction: 'ltr',
              format: '',
              indent: 0,
              children: [
                {
                  type: 'text',
                  version: 1,
                  text: 'Hello from the new blog.',
                  format: 0,
                  detail: 0,
                  mode: 'normal',
                  style: '',
                },
              ],
            },
          ],
        },
      },
    },
  })
  try {
    await page.goto('http://localhost:3000/blog')
    await expect(page.getByRole('heading', { name: 'Blog', exact: true })).toBeVisible()
    const listing = mf2(await page.content(), { baseUrl: page.url() })
    const feed = listing.items.find((item) => item.type?.includes('h-feed'))
    expect(feed?.children?.some((item) => item.type?.includes('h-entry'))).toBe(true)
    await page.getByRole('link', { name: 'The first real entry' }).click()
    await expect(page).toHaveURL('http://localhost:3000/blog/the-first-real-entry')
    await expect(page.getByText('Hello from the new blog.')).toBeVisible()
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'http://localhost:3000/blog/the-first-real-entry',
    )
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      'http://localhost:3000/blog/the-first-real-entry',
    )
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    const schema = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) || '{}',
    )
    expect(schema['@type']).toBe('BlogPosting')
    expect(schema.headline).toBe('The first real entry | Folio Suite')
    await expect(page).toHaveTitle('The first real entry | Folio Suite')
    const sitemap = await page.request.get('http://localhost:3000/blog-sitemap.xml')
    expect(await sitemap.text()).toContain(
      '<loc>http://localhost:3000/blog/the-first-real-entry</loc>',
    )
    const formats = mf2(await page.content(), { baseUrl: page.url() })
    const parsedEntry = formats.items.find((item) => item.type?.includes('h-entry'))
    expect(parsedEntry?.properties.name).toContain('The first real entry')
    expect(parsedEntry?.properties.url).toContain(page.url())
    expect(parsedEntry?.properties.content).toBeTruthy()
    await expect(page.locator('link[rel="webmention"]')).toHaveAttribute('href', '/webmention')
    const mention = await payload.create({
      collection: 'webmentions',
      context: { disableRevalidate: true },
      data: {
        key: `rendered-${entry.id}`,
        source: 'https://writer.example/reference',
        sourceTitle: 'A reference <with care>',
        target: entry.id,
        verification: 'verified',
        moderation: 'pending',
      },
    })
    await page.reload()
    await expect(page.getByRole('region', { name: 'References' })).toHaveCount(0)
    await payload.update({
      collection: 'webmentions',
      id: mention.id,
      context: { disableRevalidate: true },
      data: { moderation: 'approved' },
    })
    await page.reload()
    await expect(page.getByRole('link', { name: 'A reference <with care>' })).toHaveAttribute(
      'href',
      'https://writer.example/reference',
    )
    await payload.update({
      collection: 'blog',
      id: entry.id,
      context: { disableRevalidate: true },
      data: { slug: 'café-first', _status: 'published' },
    })
    await payload.update({
      collection: 'blog',
      id: entry.id,
      context: { disableRevalidate: true },
      data: { slug: 'café-final', _status: 'published' },
    })
    const moved = await page.request.get('http://localhost:3000/blog/caf%C3%A9-first', {
      maxRedirects: 0,
    })
    expect(moved.status()).toBe(308)
    expect(moved.headers().location).toBe('http://localhost:3000/blog/caf%C3%A9-final')
    await page.goto('http://localhost:3000/blog/caf%C3%A9-first')
    await expect(page).toHaveURL('http://localhost:3000/blog/caf%C3%A9-final')
    const legacy = await page.goto('http://localhost:3000/posts')
    expect(legacy?.status()).toBe(404)
  } finally {
    await removeFixtureRedirects()
    await payload.delete({ collection: 'blog', id: entry.id, context: { disableRevalidate: true } })
    await payload.destroy()
  }
})
