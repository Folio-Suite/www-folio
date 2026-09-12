import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies, draftMode } from 'next/headers'
import { isSite, type Site } from './config'

export type PreviewGrant = {
  site: Site
  collection: 'pages' | 'blog'
  slug: string
  documentID: number
  userID: number
  editorOrigin: string
  expires: number
}
const signature = (value: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET!)
    .update(`folio-preview:${value}`)
    .digest('base64url')
export function signPreview(grant: PreviewGrant) {
  const value = Buffer.from(JSON.stringify(grant)).toString('base64url')
  return `${value}.${signature(value)}`
}
export function readPreview(token?: string | null): PreviewGrant | null {
  if (!token || !process.env.PAYLOAD_SECRET) return null
  const [value, supplied, extra] = token.split('.')
  if (!value || !supplied || extra) return null
  const expected = signature(value)
  if (
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return null
  try {
    const grant = JSON.parse(Buffer.from(value, 'base64url').toString())
    return isSite(grant.site) &&
      ['pages', 'blog'].includes(grant.collection) &&
      typeof grant.slug === 'string' &&
      typeof grant.documentID === 'number' &&
      typeof grant.userID === 'number' &&
      typeof grant.editorOrigin === 'string' &&
      grant.expires > Date.now()
      ? grant
      : null
  } catch {
    return null
  }
}
export async function pagePreview(site: Site, collection: 'pages' | 'blog', slug: string) {
  if (!(await draftMode()).isEnabled) return null
  const grant = readPreview((await cookies()).get('folio-preview')?.value)
  return grant?.site === site && grant.collection === collection && grant.slug === slug
    ? grant
    : null
}
