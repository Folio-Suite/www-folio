import { test, expect } from '@playwright/test'

test('the clean Folio home has its own identity and a useful empty state', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page).toHaveTitle('Folio Suite')
  await expect(page.getByRole('heading', { name: 'Folio Suite', exact: true })).toBeVisible()
  await expect(page.getByText('A new website is taking shape.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Visit the blog' })).toHaveAttribute('href', '/blog')
})
