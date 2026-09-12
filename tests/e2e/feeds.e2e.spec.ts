import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { textContent } from '../helpers/content'

test('RSS, Atom and JSON share the full published stream and stable entry IDs', async ({
  page,
}) => {
  const payload = await getPayload({ config, key: 'feeds.e2e.spec' })
  const context = { disableRevalidate: true }
  const entry = await payload.create({
    collection: 'blog',
    context,
    data: {
      title: 'Feed & entry',
      slug: 'feed-entry',
      _status: 'published',
      content: textContent('The whole story, not an excerpt.'),
    },
  })
  const draft = await payload.create({
    collection: 'blog',
    context,
    data: {
      title: 'Secret draft',
      slug: 'secret-feed-draft',
      content: textContent('Do not distribute.'),
    },
  })
  try {
    const jsonResponse = await page.request.get('http://localhost:3000/feed.json')
    expect(jsonResponse.status()).toBe(200)
    expect(jsonResponse.headers()['content-type']).toContain('application/feed+json')
    const json = await jsonResponse.json()
    expect(json.version).toBe('https://jsonfeed.org/version/1.1')
    const item = json.items.find((item: { title: string }) => item.title === 'Feed & entry')
    expect(item.content_html).toContain('The whole story, not an excerpt.')
    expect(JSON.stringify(json)).not.toContain('Secret draft')
    for (const path of ['/feed.xml', '/feed.atom']) {
      const response = await page.request.get(`http://localhost:3000${path}`)
      expect(response.status()).toBe(200)
      const xml = await response.text()
      expect(xml).toContain(item.id)
      expect(xml).toContain(item.date_modified)
      expect(xml).toContain('The whole story, not an excerpt.')
      expect(xml).not.toContain('Secret draft')
      const errors = await page.evaluate(
        (xml) =>
          new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('parsererror')
            .length,
        xml,
      )
      expect(errors).toBe(0)
    }
    await payload.update({
      collection: 'blog',
      id: entry.id,
      context,
      data: { slug: 'feed-renamed' },
    })
    const refreshed = await (await page.request.get('http://localhost:3000/feed.json')).json()
    expect(refreshed.items.find((next: { id: string }) => next.id === item.id).url).toBe(
      'http://localhost:3000/blog/feed-renamed',
    )
    await page.goto('http://localhost:3000/blog')
    await expect(page.locator('link[rel=alternate][type="application/atom+xml"]')).toHaveAttribute(
      'href',
      '/feed.atom',
    )
    await expect(page.getByRole('link', { name: 'RSS', exact: true })).toBeVisible()
  } finally {
    await payload.delete({
      collection: 'blog',
      where: { id: { in: [entry.id, draft.id] } },
      context,
    })
    await payload.delete({
      collection: 'redirects',
      where: { from: { equals: '/blog/feed-entry' } },
      context,
    })
    await payload.destroy()
  }
})
