import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { textContent } from '../helpers/content'

test('readers can browse published entries by category, author and UTC month', async ({ page }) => {
  const payload = await getPayload({ config, key: 'archives.e2e.spec' })
  const context = { disableRevalidate: true }
  const user = await payload.create({
    collection: 'users',
    data: {
      name: 'Archive writer',
      email: 'archive-writer@example.test',
      password: 'local-test-password',
    },
  })
  const category = await payload.create({
    collection: 'categories',
    data: { title: 'Journeys', slug: 'journeys-test' },
  })
  const ids: number[] = []
  try {
    for (const [title, slug, publishedAt, status] of [
      ['September journey', 'september-journey', '2025-09-10T12:00:00Z', 'published'],
      ['August journey', 'august-journey', '2025-08-10T12:00:00Z', 'published'],
      ['Draft journey', 'draft-journey', '2025-09-10T12:00:00Z', 'draft'],
    ] as const) {
      ids.push(
        (
          await payload.create({
            collection: 'blog',
            context,
            data: {
              title,
              slug,
              publishedAt,
              _status: status,
              authors: [user.id],
              categories: [category.id],
              content: textContent(title),
            },
          })
        ).id,
      )
    }
    await page.goto('http://localhost:3000/blog/category/journeys-test')
    await expect(page.getByRole('heading', { name: 'Journeys', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'September journey', exact: true })).toBeVisible()
    expect(await page.content()).not.toContain('Draft journey')
    await page.goto(`http://localhost:3000/blog/author/${user.id}`)
    await expect(page.getByRole('heading', { name: 'Archive writer', exact: true })).toBeVisible()
    expect(await page.content()).not.toContain(user.email)
    await page.goto('http://localhost:3000/blog/archive/2025/09')
    await expect(page.getByRole('link', { name: 'September journey', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'August journey', exact: true })).toHaveCount(0)
    expect((await page.goto('http://localhost:3000/blog/archive/2025/13'))?.status()).toBe(404)
    expect(
      (await page.goto('http://localhost:3000/blog/category/journeys-test?page=99'))?.status(),
    ).toBe(404)
  } finally {
    await payload.delete({ collection: 'blog', where: { id: { in: ids } }, context })
    await payload.delete({ collection: 'categories', id: category.id })
    await payload.delete({ collection: 'users', id: user.id })
    await payload.destroy()
  }
})
