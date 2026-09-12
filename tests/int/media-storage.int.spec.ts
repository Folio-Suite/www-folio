// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
const video = readFileSync('tests/fixtures/blue-video.webm')
import { getPayload, type Payload } from 'payload'

const store = vi.hoisted(() => {
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_localtest_testing'
  return new Map<string, unknown>()
})

vi.mock('@vercel/blob', () => ({
  put: async (pathname: string, content: unknown) => {
    const url = `https://localtest.public.blob.vercel-storage.com/${pathname}`
    store.set(url, content)
    return { url, pathname }
  },
  del: async (url: string) => {
    store.delete(url)
  },
}))

import config from '@/payload.config'

let payload: Payload
describe('Public media storage', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  }, 60000)
  afterAll(async () => {
    await payload?.destroy()
  })

  it('rejects unsupported files and uploads over the documented limit', async () => {
    await expect(
      payload.create({
        collection: 'media',
        data: {},
        file: {
          data: Buffer.from('bad'),
          name: 'bad.exe',
          mimetype: 'application/octet-stream',
          size: 3,
        },
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'media',
        data: {},
        file: { data: video, name: 'huge.webm', mimetype: 'video/webm', size: 101 * 1024 * 1024 },
      }),
    ).rejects.toThrow(/100 MiB/)
  })

  it('stores an image and its variants beneath media/ and removes them on deletion', async () => {
    const data = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#88aacc' },
    })
      .jpeg()
      .toBuffer()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Blue test image' },
      file: { data, name: 'storage-test.jpg', mimetype: 'image/jpeg', size: data.length },
    })
    try {
      expect(media.url).toBe(
        'https://localtest.public.blob.vercel-storage.com/media/storage-test.jpg',
      )
      expect(store.size).toBeGreaterThan(1)
      const previousURLs = [...store.keys()]
      const replacement = await payload.update({
        collection: 'media',
        id: media.id,
        data: {},
        file: { data, name: 'storage-replaced.jpg', mimetype: 'image/jpeg', size: data.length },
      })
      expect(replacement.url).toBe(
        'https://localtest.public.blob.vercel-storage.com/media/storage-replaced.jpg',
      )
      expect(previousURLs.every((url) => !store.has(url))).toBe(true)
      expect(store.size).toBeGreaterThan(1)
      expect(
        [...store.keys()].every((url) =>
          url.startsWith('https://localtest.public.blob.vercel-storage.com/media/'),
        ),
      ).toBe(true)
    } finally {
      await payload.delete({ collection: 'media', id: media.id })
    }
    expect(store.size).toBe(0)
  })

  it('keeps the media prefix for folder-organized video and removes replaced files', async () => {
    const folder = await payload.create({
      collection: 'payload-folders',
      data: { name: 'Trips', folderType: ['media'] },
    })
    const data = video
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'A short trip', folder: folder.id, prefix: 'trips' },
      file: { data, name: 'trip.webm', mimetype: 'video/webm', size: data.length },
    })
    try {
      expect(media.url).toBe(
        'https://localtest.public.blob.vercel-storage.com/media/trips/trip.webm',
      )
      const updated = await payload.update({
        collection: 'media',
        id: media.id,
        data: {},
        file: { data, name: 'trip-edited.webm', mimetype: 'video/webm', size: data.length },
      })
      expect(updated.url).toBe(
        'https://localtest.public.blob.vercel-storage.com/media/trips/trip-edited.webm',
      )
      expect(store.has(media.url!)).toBe(false)
      expect(store.has(updated.url!)).toBe(true)
    } finally {
      await payload.delete({ collection: 'media', id: media.id })
      await payload.delete({ collection: 'payload-folders', id: folder.id })
    }
    expect(store.size).toBe(0)
  })
})
