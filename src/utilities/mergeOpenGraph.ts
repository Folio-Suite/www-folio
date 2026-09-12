import type { Metadata } from 'next'
import { siteName, siteDescription } from './site'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: siteDescription,
  siteName,
  title: siteName,
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
