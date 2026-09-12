import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { list } from '@vercel/blob'
import { getPayload } from 'payload'

const database = new URL(process.env.POSTGRES_URL || '')
assert(['localhost', '127.0.0.1'].includes(database.hostname), 'Use the isolated local database.')
assert(
  process.env.FOLIO_TEST_BLOB_STORE_ID?.startsWith('store_'),
  'Set the explicitly verified Folio test store ID.',
)
assert.equal(process.env.BLOB_STORE_ID, process.env.FOLIO_TEST_BLOB_STORE_ID)
const expectedHost = `${process.env.FOLIO_TEST_BLOB_STORE_ID!.slice(6).toLowerCase()}.public.blob.vercel-storage.com`
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
const prefix = `verification-${Date.now()}`
const created: number[] = []
try {
  const image = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: '#88aacc' },
  })
    .jpeg()
    .toBuffer()
  const video = await readFile('tests/fixtures/blue-video.webm')
  for (const [kind, data, mimetype] of [
    ['photo.jpg', image, 'image/jpeg'],
    ['clip.webm', video, 'video/webm'],
  ] as const) {
    const doc = await payload.create({
      collection: 'media',
      data: { prefix, alt: 'Development verification', title: 'Development verification' },
      file: { name: kind, data, mimetype, size: data.length },
    })
    created.push(doc.id)
    assert.equal(new URL(doc.url!).hostname, expectedHost)
    assert(new URL(doc.url!).pathname.startsWith(`/media/${prefix}/`))
    const response = await fetch(doc.url!)
    assert.equal(response.status, 200)
    assert(response.headers.get('content-type')?.startsWith(mimetype))
    await response.arrayBuffer()
    const before = await list({ prefix: `media/${prefix}/` })
    const updated = await payload.update({
      collection: 'media',
      id: doc.id,
      data: {},
      file: { name: `replaced-${kind}`, data, mimetype, size: data.length },
    })
    assert.equal((await fetch(updated.url!)).status, 200)
    const after = await list({ prefix: `media/${prefix}/` })
    assert(before.blobs.every((old) => !after.blobs.some((blob) => blob.url === old.url)))
    await payload.delete({ collection: 'media', id: doc.id })
    created.splice(created.indexOf(doc.id), 1)
    assert.equal((await list({ prefix: `media/${prefix}/` })).blobs.length, 0)
    console.log(
      `${mimetype}: uploaded, delivered, replaced, and deleted with no remaining test objects.`,
    )
  }
} finally {
  for (const id of created) await payload.delete({ collection: 'media', id })
  await payload.destroy()
}
