import { getRequestSite } from '@/sites/request'
import { pagePath, sites } from '@/sites/config'
import type React from 'react'
import { getRedirects } from '@/utilities/getRedirects'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDocumentURL } from '@/utilities/getDocumentURL'

interface Props {
  disableNotFound?: boolean
  url: string
}

export const PayloadRedirects: React.FC<Props> = async ({ disableNotFound, url }) => {
  const { site, previewHost } = await getRequestSite()
  const item = (await getRedirects(0, site)).find((item) => item.from === url)
  if (item?.to?.type === 'custom' && item.to.url && item.to.url !== url)
    permanentRedirect(item.to.url)
  const reference = item?.to?.reference
  if (reference) {
    const payload = await getPayload({ config })
    const id = typeof reference.value === 'object' ? reference.value.id : reference.value
    const doc = await payload.findByID({
      collection: reference.relationTo,
      id,
      depth: 0,
      draft: false,
      overrideAccess: false,
      disableErrors: true,
    })
    if (doc?.slug && doc._status === 'published') {
      const destination = getDocumentURL(
        reference.relationTo,
        doc.slug,
        'site' in doc ? doc.site : undefined,
      )
      if (destination !== new URL(url, sites[site].origin).href) {
        const targetSite = 'site' in doc ? doc.site : 'product'
        permanentRedirect(
          previewHost && reference.relationTo === 'pages'
            ? `${pagePath(doc.slug)}?site=${targetSite}`
            : destination,
        )
      }
    }
  }
  if (disableNotFound) return null
  notFound()
}
