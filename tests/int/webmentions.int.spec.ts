// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import { textContent } from '../helpers/content'
const network = vi.hoisted(() => ({
  html: '',
  requests: [] as string[],
  posts: [] as string[],
  address: '93.184.216.34',
  status: 200,
  redirect: '',
  postRedirect: 0,
}))
vi.mock('node:dns/promises', () => ({
  lookup: async () => [{ address: network.address, family: 4 }],
}))
vi.mock('undici', async (original) => {
  const actual = await original<typeof import('undici')>()
  return {
    ...actual,
    fetch: async (url: URL | string, options?: { body?: string }) => {
      if (options?.body) {
        network.posts.push(options.body)
        if (network.postRedirect) {
          const status = network.postRedirect
          network.postRedirect = 0
          return new Response(null, { status, headers: { location: '/receipt' } })
        }
        return new Response('Accepted', { status: 202 })
      }
      network.requests.push(String(url))
      return new Response(network.redirect ? null : network.html, {
        status: network.redirect ? 302 : network.status,
        headers: {
          'content-type': 'text/html',
          ...(network.redirect ? { location: network.redirect } : {}),
        },
      })
    },
  }
})
vi.mock('next/server', () => ({ after: () => {} }))
import config from '@/payload.config'
import { POST } from '@/app/(frontend)/webmention/route'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
  await payload.delete({ collection: 'webmention-limits', where: {} })
  await payload.delete({
    collection: 'blog',
    where: { slug: { in: ['mention-target', 'outgoing-link'] } },
    context: { disableRevalidate: true },
  })
}, 60000)
afterAll(async () => {
  await payload?.destroy()
})

it('verifies a source before moderation and refuses unsafe sources or missing targets', async () => {
  const context = { disableRevalidate: true }
  const entry = await payload.create({
    collection: 'blog',
    context,
    data: {
      title: 'Mention target',
      slug: 'mention-target',
      _status: 'published',
      content: textContent('A public entry.'),
    },
  })
  const target = 'http://localhost:3000/blog/mention-target'
  const submit = (source: string, targetURL = target) =>
    POST(
      new Request('http://localhost:3000/webmention', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ source, target: targetURL }),
      }),
    )
  network.html = `<html><head><title>A thoughtful reference</title></head><body><a href="${target}">Referenced article</a></body></html>`
  try {
    expect((await submit('http://127.0.0.1/private')).status).toBe(400)
    expect(
      (await submit('https://writer.example/reference', 'http://localhost:3000/blog/missing'))
        .status,
    ).toBe(400)
    expect((await submit('https://writer.example/reference')).status).toBe(202)
    await payload.jobs.run({ limit: 5 })
    const mention = (
      await payload.find({ collection: 'webmentions', where: { target: { equals: entry.id } } })
    ).docs[0]
    expect(mention.verification).toBe('verified')
    expect(mention.moderation).toBe('pending')
    expect(mention.sourceTitle).toBe('A thoughtful reference')
    await payload.update({
      collection: 'webmentions',
      id: mention.id,
      context,
      data: { moderation: 'approved' },
    })
    expect((await submit('https://writer.example/reference')).status).toBe(202)
    expect((await payload.findByID({ collection: 'webmentions', id: mention.id })).moderation).toBe(
      'approved',
    )
    await payload.jobs.run({ limit: 5 })
    expect((await payload.findByID({ collection: 'webmentions', id: mention.id })).moderation).toBe(
      'approved',
    )
    network.html = '<html><title>Removed reference</title><body>No link anymore.</body></html>'
    expect((await submit('https://writer.example/reference')).status).toBe(202)
    await payload.jobs.run({ limit: 5 })
    const revised = await payload.findByID({ collection: 'webmentions', id: mention.id })
    expect(revised.verification).toBe('invalid')
    expect(
      (await payload.find({ collection: 'webmentions', where: { target: { equals: entry.id } } }))
        .totalDocs,
    ).toBe(1)
  } finally {
    await payload.delete({
      collection: 'webmentions',
      where: { target: { equals: entry.id } },
      context,
    })
    await payload.delete({ collection: 'blog', id: entry.id, context })
  }
})

it('follows an endpoint receipt with GET after 303 and preserves POST after 307', async () => {
  const { fetchPublicURL } = await import('@/webmentions/network')
  for (const status of [303, 307]) {
    network.posts = []
    network.requests = []
    network.postRedirect = status
    network.html = 'Receipt'
    await fetchPublicURL('https://recipient.example/mentions', { body: 'source=a&target=b' })
    expect(network.posts).toHaveLength(status === 303 ? 1 : 2)
    expect(network.requests).toEqual(status === 303 ? ['https://recipient.example/receipt'] : [])
  }
})

it('queues outbound delivery on publication, discovers an endpoint, and avoids duplicate work', async () => {
  const context = { disableRevalidate: true }
  network.html = '<html><link rel="webmention" href="/mentions"><body>Recipient</body></html>'
  network.posts = []
  const content = textContent('A link')
  content.root.children = [
    {
      type: 'paragraph',
      version: 1,
      children: [
        {
          type: 'link',
          version: 3,
          fields: { linkType: 'custom', url: 'https://recipient.example/article' },
          children: [{ type: 'text', version: 1, text: 'Recipient', format: 0 }],
        },
      ],
    },
  ]
  const entry = await payload.create({
    collection: 'blog',
    context,
    data: { title: 'Outgoing link', slug: 'outgoing-link', content },
  })
  try {
    expect(
      (
        await payload.find({
          collection: 'webmention-deliveries',
          where: { entry: { equals: entry.id } },
        })
      ).totalDocs,
    ).toBe(0)
    await payload.update({
      collection: 'blog',
      id: entry.id,
      context,
      data: { _status: 'published' },
    })
    await payload.jobs.run({ limit: 10 })
    const deliveries = await payload.find({
      collection: 'webmention-deliveries',
      where: { entry: { equals: entry.id } },
    })
    expect(deliveries.docs[0].state).toBe('sent')
    expect(network.posts).toEqual([
      'source=http%3A%2F%2Flocalhost%3A3000%2Fblog%2Foutgoing-link&target=https%3A%2F%2Frecipient.example%2Farticle',
    ])
    await payload.update({
      collection: 'blog',
      id: entry.id,
      context,
      data: { title: 'An edited title' },
    })
    await payload.jobs.run({ limit: 10 })
    expect(
      (
        await payload.find({
          collection: 'webmention-deliveries',
          where: { entry: { equals: entry.id } },
        })
      ).totalDocs,
    ).toBe(1)
    expect(network.posts).toHaveLength(1)
  } finally {
    await payload.delete({ collection: 'blog', id: entry.id, context })
  }
})

it('blocks private DNS answers and redirects and bounds verification responses', async () => {
  const context = { disableRevalidate: true }
  const entry = await payload.create({
    collection: 'blog',
    context,
    data: {
      title: 'Safe verification',
      slug: 'safe-verification',
      content: textContent('Safety'),
      _status: 'published',
    },
  })
  const submit = (path: string) =>
    POST(
      new Request('http://localhost:3000/webmention', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          source: `https://writer.example/${path}`,
          target: 'http://localhost:3000/blog/safe-verification',
        }),
      }),
    )
  try {
    for (const scenario of ['dns', 'redirect', 'size']) {
      network.address = scenario === 'dns' ? '192.168.1.1' : '93.184.216.34'
      network.redirect = scenario === 'redirect' ? 'http://169.254.169.254/latest/meta-data' : ''
      network.html = scenario === 'size' ? 'x'.repeat(1024 * 1024 + 1) : ''
      const before = network.requests.length
      expect((await submit(scenario)).status).toBe(202)
      await payload.jobs.run({ limit: 10 })
      const mention = (
        await payload.find({
          collection: 'webmentions',
          where: { source: { equals: `https://writer.example/${scenario}` } },
        })
      ).docs[0]
      expect(mention.verification).toBe('error')
      if (scenario === 'dns') expect(network.requests.length).toBe(before)
      expect(network.requests.some((url) => url.includes('169.254.169.254'))).toBe(false)
    }
  } finally {
    network.address = '93.184.216.34'
    network.redirect = ''
    network.html = ''
    await payload.delete({ collection: 'blog', id: entry.id, context })
  }
})

it('persists a failed delivery and supports an intentional admin retry with no endpoint', async () => {
  const context = { disableRevalidate: true }
  const content = textContent('Linked')
  content.root.children = [
    {
      type: 'paragraph',
      version: 1,
      children: [
        {
          type: 'link',
          version: 3,
          fields: { linkType: 'custom', url: 'https://recipient.example/retry' },
          children: [{ type: 'text', version: 1, text: 'Recipient', format: 0 }],
        },
      ],
    },
  ]
  network.status = 503
  const entry = await payload.create({
    collection: 'blog',
    context,
    data: { title: 'Retry', slug: 'retry-mention', content, _status: 'published' },
  })
  try {
    await payload.jobs.run({ limit: 10 })
    const delivery = (
      await payload.find({
        collection: 'webmention-deliveries',
        where: { entry: { equals: entry.id } },
      })
    ).docs[0]
    expect(delivery.state).toBe('failed')
    expect(delivery.attempts).toBe(1)
    network.status = 200
    network.html = '<html><body>No endpoint here.</body></html>'
    await payload.update({
      collection: 'webmention-deliveries',
      id: delivery.id,
      context,
      data: { retry: true },
    })
    await payload.jobs.run({ limit: 10 })
    expect(
      (await payload.findByID({ collection: 'webmention-deliveries', id: delivery.id })).state,
    ).toBe('no-endpoint')
  } finally {
    network.status = 200
    await payload.delete({ collection: 'blog', id: entry.id, context })
  }
})

it('enforces a durable per-client submission limit', async () => {
  const context = { disableRevalidate: true }
  await payload.delete({ collection: 'webmention-limits', where: {} })
  const entry = await payload.create({
    collection: 'blog',
    context,
    data: {
      title: 'Rate limited',
      slug: 'rate-limited',
      content: textContent('Limited'),
      _status: 'published',
    },
  })
  try {
    for (let index = 0; index < 21; index++) {
      const response = await POST(
        new Request('http://localhost:3000/webmention', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            source: 'https://writer.example/rate-limit',
            target: 'http://localhost:3000/blog/rate-limited',
          }),
        }),
      )
      expect(response.status).toBe(index < 20 ? 202 : 429)
    }
  } finally {
    await payload.delete({ collection: 'blog', id: entry.id, context })
  }
})
