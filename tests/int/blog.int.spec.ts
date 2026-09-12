// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { textContent } from '../helpers/content'

let payload: Payload

describe('Blog publishing', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  }, 60000)

  afterAll(async () => {
    await payload?.destroy()
  })

  it('normalizes optional author handles and rejects invalid account attribution', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        name: 'Test writer',
        email: 'writer@example.test',
        password: 'local-test-password',
        twitterHandle: '  TheCTwelve  ',
      },
    })
    try {
      expect(user.twitterHandle).toBe('@TheCTwelve')
      await expect(
        payload.update({
          collection: 'users',
          id: user.id,
          context: { disableRevalidate: true },
          data: { twitterHandle: '@not valid!' },
        }),
      ).rejects.toThrow()
      const cleared = await payload.update({
        collection: 'users',
        id: user.id,
        context: { disableRevalidate: true },
        data: { twitterHandle: '' },
      })
      expect(cleared.twitterHandle).toBe('')
    } finally {
      await payload.delete({ collection: 'users', id: user.id })
    }
  })

  it('publishes only safe author profiles and refreshes them after edits', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        name: 'Public writer',
        email: `private-author-${Date.now()}@example.test`,
        password: 'local-test-password',
        twitterHandle: '@Writer',
      },
    })
    const entry = await payload.create({
      collection: 'blog',
      context: { disableRevalidate: true },
      data: {
        title: 'Bylined',
        slug: 'bylined-test',
        authors: [user.id],
        _status: 'published',
        content: textContent('Author attribution'),
      },
    })
    try {
      const read = () =>
        payload.findByID({ collection: 'blog', id: entry.id, overrideAccess: false })
      const initial = await read()
      expect(initial.populatedAuthors).toEqual([
        { id: String(user.id), name: 'Public writer', twitterHandle: '@Writer' },
      ])
      expect(JSON.stringify(initial)).not.toContain(user.email)
      await payload.update({
        collection: 'users',
        id: user.id,
        context: { disableRevalidate: true },
        data: { twitterHandle: '@NewWriter' },
      })
      expect((await read()).populatedAuthors?.[0]?.twitterHandle).toBe('@NewWriter')
      await payload.update({
        collection: 'blog',
        id: entry.id,
        data: { authors: [] },
        context: { disableRevalidate: true },
      })
      expect((await read()).populatedAuthors).toEqual([])
    } finally {
      await payload.delete({
        collection: 'blog',
        id: entry.id,
        context: { disableRevalidate: true },
      })
      await payload.delete({ collection: 'users', id: user.id })
    }
  })

  it('publishes an entry through the blog collection and makes it publicly readable', async () => {
    const entry = await payload.create({
      collection: 'blog',
      context: { disableRevalidate: true },
      data: {
        title: 'A new beginning',
        slug: 'a-new-beginning',
        content: {
          root: {
            type: 'root',
            version: 1,
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [
                  {
                    type: 'text',
                    version: 1,
                    text: 'Welcome to the blog.',
                    format: 0,
                    detail: 0,
                    mode: 'normal',
                    style: '',
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
          },
        },
        _status: 'published',
      },
    })
    try {
      const published = await payload.findByID({
        collection: 'blog',
        id: entry.id,
        overrideAccess: false,
      })
      expect(published.title).toBe('A new beginning')
      expect(published.slug).toBe('a-new-beginning')
    } finally {
      await payload.delete({
        collection: 'blog',
        id: entry.id,
        context: { disableRevalidate: true },
      })
    }
  })

  it('retains old published permalinks across renames and rejects a reserved slug', async () => {
    const context = { disableRevalidate: true }
    const entry = await payload.create({
      collection: 'blog',
      context,
      data: {
        title: 'Durable',
        slug: 'durable-original',
        content: textContent('Durable links'),
        _status: 'published',
      },
    })
    try {
      await payload.update({
        collection: 'blog',
        id: entry.id,
        draft: true,
        context,
        data: { slug: 'durable-draft', _status: 'draft' },
      })
      expect(
        (
          await payload.find({
            collection: 'redirects',
            where: { from: { equals: '/blog/durable-original' } },
          })
        ).totalDocs,
      ).toBe(0)
      await payload.update({
        collection: 'blog',
        id: entry.id,
        context,
        data: { slug: 'durable-second', _status: 'published' },
      })
      await payload.update({
        collection: 'blog',
        id: entry.id,
        context,
        data: { slug: 'durable-third', _status: 'published' },
      })
      const redirects = await payload.find({
        collection: 'redirects',
        depth: 0,
        where: { from: { in: ['/blog/durable-original', '/blog/durable-second'] } },
      })
      expect(redirects.totalDocs).toBe(2)
      expect(redirects.docs.every((redirect) => redirect.to?.reference?.value === entry.id)).toBe(
        true,
      )
      await expect(
        payload.create({
          collection: 'blog',
          context,
          data: {
            title: 'Conflict',
            slug: 'durable-original',
            content: textContent('Conflict'),
            _status: 'published',
          },
        }),
      ).rejects.toThrow(/reserved/)
      await payload.update({
        collection: 'blog',
        id: entry.id,
        context,
        data: { slug: 'durable-original', _status: 'published' },
      })
      expect(
        (
          await payload.find({
            collection: 'redirects',
            where: { from: { equals: '/blog/durable-original' } },
          })
        ).totalDocs,
      ).toBe(0)
    } finally {
      await payload.delete({ collection: 'blog', id: entry.id, context })
      await payload.delete({
        collection: 'redirects',
        where: { from: { contains: '/blog/durable-' } },
        context,
      })
    }
  })
})
