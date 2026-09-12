import type { Site } from '@/sites/config'
import type { Config } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

type Collection = keyof Config['collections']

async function getDocument(
  collection: Collection,
  slug: string,
  depth = 0,
  site: Site = 'product',
) {
  const payload = await getPayload({ config: configPromise })

  const page = await payload.find({
    collection,
    depth,
    overrideAccess: false,
    where: {
      ...(collection === 'pages' ? { site: { equals: site } } : {}),
      slug: {
        equals: slug,
      },
    },
  })

  return page.docs[0]
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedDocument = (collection: Collection, slug: string, site: Site = 'product') =>
  unstable_cache(async () => getDocument(collection, slug, 0, site), [collection, slug, site], {
    tags: [`${collection}_${slug}`],
  })
