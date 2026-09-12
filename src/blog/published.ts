import type { Where } from 'payload'

export const publishedBlogWhere = (): Where => ({
  and: [
    { _status: { equals: 'published' } },
    {
      or: [
        { publishedAt: { less_than_equal: new Date().toISOString() } },
        { publishedAt: { exists: false } },
      ],
    },
  ],
})
export const blogSort = ['-publishedAt', '-id']
export const blogPageSize = 12
