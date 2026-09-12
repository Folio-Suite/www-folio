import { APIError, type CollectionBeforeValidateHook, type Plugin } from 'payload'
import { handleUpload } from '@vercel/blob/client'

export const mediaMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'video/mp4',
  'video/webm',
]
export const maxMediaBytes = 100 * 1024 * 1024

export const validateMediaUpload: CollectionBeforeValidateHook = ({ data, req }) => {
  if ((req.file?.size || data?.filesize || 0) > maxMediaBytes) {
    throw new APIError('Media uploads must be 100 MiB or smaller.', 400)
  }
  if (req.file && !mediaMimeTypes.includes(req.file.mimetype)) {
    throw new APIError('Upload JPEG, PNG, WebP, AVIF, GIF, MP4, or WebM media.', 400)
  }
  return data
}

// Payload's client handler does not set Blob token size or content-type limits.
// Preserve its endpoint and browser integration while constraining signed uploads.
export const mediaUploadPolicy: Plugin = (config) => {
  config.endpoints = config.endpoints?.map((endpoint) =>
    endpoint.path !== '/vercel-blob-client-upload-route'
      ? endpoint
      : {
          ...endpoint,
          handler: async (req) => {
            const body = await req.json!()
            const result = await handleUpload({
              body,
              request: new Request(
                req.url || 'http://localhost/api/vercel-blob-client-upload-route',
                { method: 'POST', headers: req.headers, body: JSON.stringify(body) },
              ),
              token: process.env.BLOB_READ_WRITE_TOKEN,
              onBeforeGenerateToken: async (pathname, collection) => {
                if (!req.user || collection !== 'media') throw new APIError('Not authorized.', 403)
                if (
                  !pathname.startsWith('media/') ||
                  pathname.split('/').some((part) => !part || part === '.' || part === '..') ||
                  pathname.includes('\\')
                ) {
                  throw new APIError('Media uploads must use a path beneath media/.', 400)
                }
                return {
                  allowedContentTypes: mediaMimeTypes,
                  maximumSizeInBytes: maxMediaBytes,
                  allowOverwrite: true,
                  addRandomSuffix: false,
                }
              },
              onUploadCompleted: async () => {},
            })
            return Response.json(result)
          },
        },
  )
  return config
}
