// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test'

test('the static root, pages, navigation and mobile layout work without an application server', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page).toHaveTitle('Developer resources | Folio Suite Development')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tools for thoughtful work.')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  expect(await page.locator('script').count()).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const url of ['/about/', '/blog/', '/documentation/'])
    expect((await request.get(url)).status()).toBe(200)
  const missing = await request.get('/not-a-real-page/')
  expect(missing.status()).toBe(404)
})

test('Markdown posts render with canonical metadata and drafts stay out of pages and feeds', async ({
  page,
  request,
}) => {
  await page.goto('/blog/')
  await page.getByRole('link', { name: 'Developer resources for Folio Suite' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Developer resources for Folio Suite',
  )
  await expect(page.getByRole('heading', { name: 'Start with the documentation' })).toBeVisible()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://foliosuite.dev/blog/developer-resources/',
  )
  for (const url of ['/blog/', '/feed.xml', '/sitemap-0.xml']) {
    const body = await (await request.get(url)).text()
    expect(body).not.toContain('folio-browser-draft')
    expect(body).not.toContain('PRIVATE_DRAFT_TEST_MARKER')
    expect(body).not.toContain('welcome')
  }
  const feed = await (await request.get('/feed.xml')).text()
  expect(feed).toContain('Source, development notes &amp; API documentation for Folio Suite.')
  expect(feed).toContain('https://foliosuite.dev/blog/developer-resources/')
  expect((await request.get('/blog/welcome/')).status()).toBe(404)
})

test('real DocC assets, version selection, direct refresh and search work on a static host', async ({
  page,
  request,
}) => {
  const failures: string[] = []
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })
  page.on('pageerror', (error) => failures.push(error.message))
  await page.goto('/UndoKit/')
  await expect(page.getByRole('heading', { level: 1, name: 'UndoKit', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'UndoKit version' })).toHaveValue('latest')
  await page.goto('/UndoKit/documentation/undokit/historysession/')
  await page.getByRole('combobox', { name: 'UndoKit version' }).selectOption('0.2.0')
  await expect(page).toHaveURL(
    /\/UndoKit\/versions\/0\.2\.0\/documentation\/undokit\/historysession\//,
  )
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'UndoKit version' })).toHaveValue('0.2.0')
  const filter = page.getByPlaceholder('Filter')
  await filter.fill('HistorySession')
  await expect(
    page.getByRole('link', { name: 'HistorySession', exact: true }).first(),
  ).toBeVisible()
  expect((await request.get('/UndoKit/_folio/selector.js')).headers()['content-type']).toContain(
    'javascript',
  )
  expect((await request.get('/UndoKit/versions/0.2.0/original/manifest.json')).status()).toBe(404)
  await page.waitForLoadState('networkidle')
  expect(failures).toEqual([])
})

test('the version selector explains an unavailable older topic and legacy latest links work', async ({
  page,
}) => {
  await page.goto('/UndoKit/documentation/undokit/historysession/setnativeactionnameresolver(_:)/')
  await page.getByRole('combobox', { name: 'UndoKit version' }).selectOption('0.2.0')
  await expect(page.locator('#folio-documentation-nav [role=status]')).toContainText(
    'That topic is unavailable in this version',
  )
  await page.goto('/UndoKit/latest/')
  await expect(page.getByRole('combobox', { name: 'UndoKit version' })).toHaveValue('latest')
})
