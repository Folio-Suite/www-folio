import { APIError, type CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { authenticated } from '@/access/authenticated'

export const Webmentions: CollectionConfig = {
  slug: 'webmentions',
  admin: {
    useAsTitle: 'sourceTitle',
    defaultColumns: ['source', 'verification', 'moderation', 'updatedAt'],
  },
  access: {
    create: () => false,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'key', type: 'text', unique: true, required: true, admin: { hidden: true } },
    { name: 'source', type: 'text', required: true, admin: { readOnly: true } },
    {
      name: 'target',
      type: 'relationship',
      relationTo: 'blog',
      required: true,
      admin: { readOnly: true },
    },
    { name: 'sourceTitle', type: 'text', admin: { readOnly: true } },
    { name: 'fingerprint', type: 'text', admin: { hidden: true } },
    {
      name: 'verification',
      type: 'select',
      options: ['pending', 'verified', 'invalid', 'error'],
      defaultValue: 'pending',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'moderation',
      type: 'select',
      options: ['pending', 'approved', 'rejected'],
      defaultValue: 'pending',
      required: true,
    },
    { name: 'error', type: 'textarea', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (
          data.moderation === 'approved' &&
          (data.verification || originalDoc?.verification) !== 'verified'
        )
          throw new APIError('Only verified references can be approved.', 400)
        return data
      },
    ],
    afterChange: [
      ({ doc, req }) => {
        if (!req.context.disableRevalidate) revalidatePath('/blog', 'layout')
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req }) => {
        if (!req.context.disableRevalidate) revalidatePath('/blog', 'layout')
        return doc
      },
    ],
  },
}

export const WebmentionLimits: CollectionConfig = {
  slug: 'webmention-limits',
  admin: { hidden: true },
  access: { create: () => false, read: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'bucket', type: 'text', required: true, unique: true },
    { name: 'count', type: 'number', required: true },
  ],
}
