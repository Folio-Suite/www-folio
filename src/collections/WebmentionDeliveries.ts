import { APIError, type CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { wakeWebmentions } from '@/webmentions/send'

export const WebmentionDeliveries: CollectionConfig = {
  slug: 'webmention-deliveries',
  admin: { useAsTitle: 'target', defaultColumns: ['target', 'state', 'attempts', 'updatedAt'] },
  access: {
    create: () => false,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'key', type: 'text', unique: true, required: true, admin: { hidden: true } },
    {
      name: 'entry',
      type: 'relationship',
      relationTo: 'blog',
      required: true,
      admin: { readOnly: true },
    },
    { name: 'source', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'target', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'endpoint', type: 'text', admin: { readOnly: true } },
    {
      name: 'state',
      type: 'select',
      options: ['pending', 'sent', 'no-endpoint', 'failed', 'canceled'],
      required: true,
      defaultValue: 'pending',
      admin: { readOnly: true },
    },
    { name: 'attempts', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'error', type: 'textarea', admin: { readOnly: true } },
    {
      name: 'retry',
      type: 'checkbox',
      label: 'Retry this failed notification',
      admin: { description: 'Select and save to queue a fresh, bounded retry.' },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        if (data.retry) {
          if (originalDoc?.state !== 'failed')
            throw new APIError('Only failed notifications can be retried.', 400)
          req.context.retryWebmention = true
          data.retry = false
          data.state = 'pending'
          data.attempts = 0
          data.error = ''
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        if (req.context.retryWebmention) {
          req.context.retryWebmention = false
          await req.payload.jobs.queue({ task: 'sendWebmention', input: { id: doc.id }, req })
          wakeWebmentions(req)
        }
        return doc
      },
    ],
  },
}

export const WebmentionPublications: CollectionConfig = {
  slug: 'webmention-publications',
  admin: { hidden: true },
  access: { create: () => false, read: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'entry', type: 'relationship', relationTo: 'blog', required: true, unique: true },
    { name: 'fingerprint', type: 'text', required: true },
    { name: 'revision', type: 'number', required: true },
    { name: 'targets', type: 'json' },
  ],
}
