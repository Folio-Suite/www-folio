// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test'

test('documentation selector preserves topics and accepts focus on narrow screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:3000/UndoKit/documentation/undokit/common?site=development')
  const selector = page.getByRole('combobox', { name: 'UndoKit version' })
  await expect(selector).toBeEnabled()
  await expect(selector).toHaveValue('latest')
  await selector.focus()
  await expect(selector).toBeFocused()
  await selector.selectOption('0.2.0')
  await expect(page).toHaveURL(/\/UndoKit\/versions\/0\.2\.0\/documentation\/undokit\/common/)
  await expect(page.getByRole('heading')).toHaveText('Archived fixture')
  await expect(page.getByRole('combobox')).toHaveValue('0.2.0')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await expect(page.getByRole('combobox')).toBeEnabled()
  await page.getByRole('combobox').selectOption('latest')
  await expect(page).toHaveURL(/\/UndoKit\/documentation\/undokit\/common/)
})

test('version switching uses the current DocC location and explains missing topics', async ({
  page,
}) => {
  await page.goto('http://localhost:3000/UndoKit/documentation/undokit?site=development')
  await expect(page.getByRole('combobox')).toBeEnabled()
  await page.getByRole('button', { name: 'Visit removed topic without reloading' }).click()
  await page.getByRole('combobox').selectOption('0.2.0')
  await expect(page).toHaveURL(/\/versions\/0\.2\.0\/documentation\/undokit\?/)
  expect(new URL(page.url()).searchParams.get('docc-topic-unavailable')).toBe('1')
  await expect(page.getByRole('status')).toContainText('That topic is unavailable in this version')
})
