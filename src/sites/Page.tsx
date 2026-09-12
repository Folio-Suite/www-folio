import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React, { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { pagePath, sites } from '@/sites/config'
import { pagePreview } from '@/sites/preview'
import { getRequestSite } from '@/sites/request'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from '@/app/(frontend)/[slug]/page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

const decodeSlug = (slug: string) => {
  try {
    return decodeURIComponent(slug)
  } catch {
    notFound()
  }
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { site } = await getRequestSite()
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeSlug(slug)
  const preview = await pagePreview(site, 'pages', decodedSlug)
  const url = pagePath(decodedSlug)
  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  if (!page && slug === 'home') {
    return (
      <>
        <PayloadRedirects disableNotFound url={url} />
        <main className="container py-24">
          <h1 className="text-4xl font-semibold mb-6">{sites[site].name}</h1>
          <p className="mb-6">
            {site === 'product'
              ? 'A new website is taking shape.'
              : 'Follow the development of Folio Suite.'}
          </p>
          <Link className="underline" href="/blog">
            Visit the blog
          </Link>
        </main>
      </>
    )
  }

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {preview && (
        <>
          <aside className="container mb-4">Preview: {sites[site].label}</aside>
          <LivePreviewListener serverURL={preview.editorOrigin} />
        </>
      )}

      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeSlug(slug)
  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  const { site } = await getRequestSite()
  if (!page)
    return {
      title: sites[site].name,
      description: sites[site].description,
      alternates: { canonical: sites[site].origin + '/' },
    }
  const metadata = await generateMeta({ doc: page })
  if (await pagePreview(site, 'pages', decodedSlug))
    metadata.robots = { index: false, follow: false }
  return metadata
}

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const payload = await getPayload({ config: configPromise })

  const { site } = await getRequestSite()
  const preview = await pagePreview(site, 'pages', slug)
  const draft = Boolean(preview)
  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      ...(preview ? { id: { equals: preview.documentID } } : {}),
      site: { equals: site },
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
