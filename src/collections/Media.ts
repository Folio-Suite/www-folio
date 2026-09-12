import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { mediaMimeTypes, validateMediaUpload } from '../media/uploadPolicy'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  folders: true,
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    description:
      'Images: JPEG, PNG, WebP, AVIF, GIF. Video: MP4 (H.264/AAC recommended), WebM. Maximum 100 MiB. Video is served as uploaded; no transcoding.',
  },
  hooks: { beforeValidate: [validateMediaUpload] },
  fields: [
    { name: 'title', type: 'text' },
    { name: 'description', type: 'textarea' },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      maxDepth: 1,
      filterOptions: { mimeType: { contains: 'image/' } },
      admin: { condition: (data) => data.mimeType?.startsWith('video/') },
    },
    {
      name: 'captionTracks',
      type: 'array',
      admin: {
        description: 'WebVTT (.vtt) URLs. Cross-origin tracks require CORS on their server.',
        condition: (data) => data.mimeType?.startsWith('video/'),
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'language',
          type: 'text',
          required: true,
          validate: (value: string | null | undefined) =>
            !value ||
            /^[a-z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(value) ||
            'Use a language tag such as en or en-US.',
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: (value: string | null | undefined) => {
            if (!value) return true
            try {
              const url = new URL(value, 'https://foliosuite.app')
              return (
                (url.protocol === 'https:' && url.pathname.endsWith('.vtt')) ||
                'Use an HTTPS or site-relative WebVTT (.vtt) URL.'
              )
            } catch {
              return 'Use a valid WebVTT URL.'
            }
          },
        },
      ],
    },
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    mimeTypes: mediaMimeTypes,
    // Upload to the public/media directory in Next.js making them publicly accessible even outside of Payload
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
