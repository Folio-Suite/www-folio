import sharp from 'sharp'
import { mediaUploadPolicy } from './media/uploadPolicy'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { resendAdapter } from '@payloadcms/email-resend'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Blog } from './collections/Blog'
import { Webmentions, WebmentionLimits } from './collections/Webmentions'
import { WebmentionDeliveries, WebmentionPublications } from './collections/WebmentionDeliveries'
import { sendWebmention } from './webmentions/send'
import { verifyWebmention } from './webmentions/tasks'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: vercelPostgresAdapter({
    push: process.env.PAYLOAD_SCHEMA_PUSH === 'true',
    pool: {
      connectionString: process.env.POSTGRES_URL || '',
    },
  }),
  collections: [
    Pages,
    Blog,
    Media,
    Categories,
    Users,
    Webmentions,
    WebmentionLimits,
    WebmentionDeliveries,
    WebmentionPublications,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  plugins: [
    ...plugins,
    vercelBlobStorage({
      enabled: true,
      alwaysInsertFields: true,
      useCompositePrefixes: true,
      clientUploads: true,
      collections: {
        media: { prefix: 'media', disablePayloadAccessControl: true },
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
    mediaUploadPolicy,
  ],
  globals: [Header, Footer],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    enableConcurrencyControl: true,
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [verifyWebmention, sendWebmention],
  },
  email: resendAdapter({
    defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'webmaster@foliosuite.app',
    defaultFromName: process.env.EMAIL_FROM_NAME || 'Folio Suite',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
})
