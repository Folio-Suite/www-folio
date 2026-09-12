import type { Block } from 'payload'

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  interfaceName: 'MediaBlock',
  fields: [
    {
      name: 'decorative',
      type: 'checkbox',
      label: 'Decorative image (empty alt text)',
      defaultValue: false,
    },
    {
      name: 'autoplay',
      type: 'checkbox',
      label: 'Autoplay video (also mutes it)',
      defaultValue: false,
    },
    { name: 'loop', type: 'checkbox', defaultValue: false },
    { name: 'muted', type: 'checkbox', defaultValue: false },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}
