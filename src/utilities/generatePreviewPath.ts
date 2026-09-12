import type { PayloadRequest } from 'payload'

type Props = {
  collection: 'pages' | 'blog'
  id?: unknown
  slug?: string | null
  req: PayloadRequest
}

export const generatePreviewPath = ({ collection, id }: Props) => {
  if ((typeof id !== 'number' && typeof id !== 'string') || !id) return null
  return `/next/preview?${new URLSearchParams({ collection, id: String(id) })}`
}
