// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config'
let payload: Payload
const context = { disableRevalidate: true }
beforeAll(async () => {
  payload = await getPayload({ config })
})
afterAll(async () => {
  await payload.destroy()
})

it('reserves page and redirect paths per site and rejects redirect loops', async () => {
  const page = await payload.create({
    collection: 'pages',
    context,
    data: {
      site: 'product',
      title: 'Reserved product path',
      slug: 'reserved-site-path',
      hero: { type: 'none' },
      layout: [{ blockType: 'content', columns: [] }],
      _status: 'published',
    },
  })
  try {
    await expect(
      payload.create({
        collection: 'redirects',
        context,
        data: {
          site: 'product',
          from: '/reserved-site-path',
          to: { type: 'custom', url: '/destination' },
        },
      }),
    ).rejects.toThrow(/reserved/i)
    await payload.create({
      collection: 'redirects',
      context,
      data: {
        site: 'development',
        from: '/reserved-site-path',
        to: { type: 'reference', reference: { relationTo: 'pages', value: page.id } },
      },
    })
    await expect(
      payload.create({
        collection: 'pages',
        context,
        data: {
          site: 'development',
          title: 'Conflict',
          slug: 'reserved-site-path',
          hero: { type: 'none' },
          layout: [{ blockType: 'content', columns: [] }],
          _status: 'published',
        },
      }),
    ).rejects.toThrow(/reserved/i)
    await payload.create({
      collection: 'redirects',
      context,
      data: { site: 'product', from: '/loop-site-a', to: { type: 'custom', url: '/loop-site-b' } },
    })
    await expect(
      payload.create({
        collection: 'redirects',
        context,
        data: {
          site: 'product',
          from: '/loop-site-b',
          to: { type: 'custom', url: '/loop-site-a' },
        },
      }),
    ).rejects.toThrow(/loop/i)
    await expect(
      payload.create({
        collection: 'pages',
        context,
        data: {
          site: 'product',
          title: 'Reserved system route',
          slug: 'blog',
          hero: { type: 'none' },
          layout: [{ blockType: 'content', columns: [] }],
          _status: 'published',
        },
      }),
    ).rejects.toThrow(/reserved/i)
  } finally {
    await payload.delete({
      collection: 'redirects',
      context,
      where: { from: { in: ['/reserved-site-path', '/loop-site-a', '/loop-site-b'] } },
    })
    await payload.delete({ collection: 'pages', context, id: page.id })
  }
})
