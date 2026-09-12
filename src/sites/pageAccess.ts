import type { Access, Where } from 'payload'
import { resolveSite } from './config'

export const readPages: Access = ({ req }) => {
  if (req.user) return true
  const selected = req.headers.get('cookie')?.match(/(?:^|;\s*)folio-site=([^;]*)/)?.[1]
  const host = req.headers.get('host')
  const destination = resolveSite(host, selected)
  if (host && !destination) return false
  const where: Where = { _status: { equals: 'published' } }
  if (destination) where.site = { equals: destination.site }
  return where
}
