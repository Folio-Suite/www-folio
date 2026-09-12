import type { CollectionConfig } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

import { authenticated } from '../../access/authenticated'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'twitterHandle',
      type: 'text',
      label: 'Twitter / X handle',
      admin: { description: 'Optional public attribution, for example @TheCTwelve.' },
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === 'string'
              ? value.trim()
                ? `@${value.trim().replace(/^@/, '')}`
                : ''
              : value,
        ],
      },
      validate: (value: string | null | undefined) =>
        !value ||
        /^@[A-Za-z0-9_]{1,15}$/.test(value) ||
        'Use 1–15 letters, digits, or underscores, with an optional @.',
    },
    {
      name: 'name',
      type: 'text',
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc, operation, req }) => {
        if (
          operation === 'update' &&
          !req.context.disableRevalidate &&
          (doc.name !== previousDoc.name || doc.twitterHandle !== previousDoc.twitterHandle)
        ) {
          revalidatePath('/blog', 'layout')
          revalidateTag('blog-content', 'max')
        }
        return doc
      },
    ],
  },
  timestamps: true,
}
