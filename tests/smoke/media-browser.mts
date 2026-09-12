import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'
import { getPayload } from 'payload'
import { list, del } from '@vercel/blob'
import sharp from 'sharp'

assert(
  process.env.FOLIO_TEST_BLOB_STORE_ID?.startsWith('store_'),
  'Set the explicitly verified Folio test store ID.',
)
assert.equal(process.env.BLOB_STORE_ID, process.env.FOLIO_TEST_BLOB_STORE_ID)
assert(['localhost', '127.0.0.1'].includes(new URL(process.env.POSTGRES_URL!).hostname))
process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3100'
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config, key: 'media-browser-smoke' })
const name = `browser-verify-${Date.now()}`
const password = 'local-browser-verification-only'
const user = await payload.create({
  collection: 'users',
  data: { email: `${name}@example.test`, password, name: 'Browser verification' },
})
const context = { disableRevalidate: true }
const ids: number[] = []
let pageID: number | undefined
const captionsPath = `public/${name}.vtt`
await writeFile(captionsPath, 'WEBVTT\n\n00:00.000 --> 00:02.000\nA blue test frame.\n')
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--port', '3100'],
  { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
)
let serverLog = ''
server.stdout.on('data', (data) => {
  serverLog += data
})
server.stderr.on('data', (data) => {
  serverLog += data
})
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
})
try {
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  let ready = false
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch('http://localhost:3100/admin/login')).ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  assert(ready, `Development server did not start: ${serverLog.slice(-3000)}`)
  await page.request.post('http://localhost:3100/api/users/login', {
    data: { email: user.email, password },
  })
  const photo = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: '#88aacc' },
  })
    .jpeg()
    .toBuffer()
  const video = await readFile('tests/fixtures/blue-video.webm')
  for (const [filename, mimeType, buffer, title] of [
    [`${name}-photo.jpg`, 'image/jpeg', photo, 'A blue photo'],
    [`${name}-video.webm`, 'video/webm', video, 'A short blue video'],
  ] as const) {
    await page.goto('http://localhost:3100/admin/collections/media/create')
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({ name: filename, mimeType, buffer })
    await page.locator('input[name=title]').fill(title)
    await page.locator('input[name=alt]').fill('A blue test image')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForURL(/\/admin\/collections\/media\/\d+/)
    const doc = (
      await payload.find({
        collection: 'media',
        where: { filename: { equals: filename } },
        limit: 1,
      })
    ).docs[0]
    assert(doc, 'Uploaded media record exists')
    ids.push(doc.id)
    assert(
      new URL(doc.url!).hostname ===
        `${process.env.FOLIO_TEST_BLOB_STORE_ID!.slice(6).toLowerCase()}.public.blob.vercel-storage.com`,
    )
    console.log(`${mimeType}: browser client upload and CMS save passed.`)
  }
  await payload.update({
    collection: 'media',
    id: ids[1],
    data: {
      poster: ids[0],
      description: 'A silent blue test clip.',
      captionTracks: [{ language: 'en', label: 'English', url: `/${name}.vtt` }],
    },
  })
  const document = await payload.create({
    collection: 'pages',
    context,
    data: {
      title: 'Media verification',
      slug: name,
      hero: { type: 'none' },
      _status: 'published',
      layout: [
        { blockType: 'mediaBlock', media: ids[0], decorative: true },
        { blockType: 'mediaBlock', media: ids[1] },
      ],
    },
  })
  pageID = document.id
  await page.goto(`http://localhost:3100/${name}`)
  const image = page.locator('main img, article img').first()
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(image).toBeVisible()
    await expect(image).toHaveAttribute('alt', '')
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
    const box = await image.boundingBox()
    assert(box && box.width <= width && box.height > 0)
  }
  const player = page.locator('video')
  await expect(player).toHaveAttribute('aria-label', 'A short blue video')
  await expect(player).toHaveAttribute('preload', 'metadata')
  await expect(page.locator('video track')).toHaveAttribute('srclang', 'en')
  await player.scrollIntoViewIfNeeded()
  await player.focus()
  await player.press('Space')
  await expect
    .poll(() => player.evaluate((element) => (element as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0)
  console.log(
    'Narrow/wide images, decorative alt, poster, caption markup, and keyboard video playback passed in Chromium.',
  )
} finally {
  if (pageID) await payload.delete({ collection: 'pages', id: pageID, context })
  for (const id of ids.reverse()) await payload.delete({ collection: 'media', id })
  const remaining = await list({ prefix: `media/${name}` })
  if (remaining.blobs.length) await del(remaining.blobs.map(({ url }) => url))
  await payload.delete({ collection: 'users', id: user.id })
  await unlink(captionsPath)
  await browser.close()
  server.kill('SIGTERM')
  await payload.destroy()
}
