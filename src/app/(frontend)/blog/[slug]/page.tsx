import type { Metadata } from 'next'

import { RelatedEntries } from '@/blocks/RelatedEntries/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { pagePreview } from '@/sites/preview'
import { getRequestSite } from '@/sites/request'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { BlogEntry } from '@/payload-types'

import { References } from '@/webmentions/References'
import { BlogHero } from '@/heros/BlogHero'
import { articleSchema, serializeSchema } from '@/utilities/publishingMetadata'
import { getDocumentURL } from '@/utilities/getDocumentURL'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const blog = await payload.find({
    collection: 'blog',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = blog.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    notFound()
  }
}

export default async function BlogEntry({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeSlug(slug)
  const { site } = await getRequestSite()
  const preview = await pagePreview(site, 'blog', decodedSlug)
  const draft = Boolean(preview)
  const url = '/blog/' + encodeURIComponent(decodedSlug)
  const post = await queryBlogEntryBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  return (
    <article className="h-entry pt-16 pb-16">
      {!draft && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeSchema(articleSchema(post)) }}
        />
      )}
      <link rel="webmention" href="/webmention" />
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {preview && <LivePreviewListener serverURL={preview.editorOrigin} />}

      <BlogHero post={post} />

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container">
          <RichText
            className="e-content max-w-[48rem] mx-auto"
            data={post.content}
            enableGutter={false}
          />
          {!draft && <References target={post.id} />}
          {post.relatedEntries && post.relatedEntries.length > 0 && (
            <RelatedEntries
              className="mt-12 max-w-[52rem] lg:grid lg:grid-cols-subgrid col-start-1 col-span-3 grid-rows-[2fr]"
              docs={post.relatedEntries.filter((post) => typeof post === 'object')}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeSlug(slug)
  const post = await queryBlogEntryBySlug({ slug: decodedSlug })

  const metadata = await generateMeta({ doc: post, collection: 'blog' })
  if (await pagePreview((await getRequestSite()).site, 'blog', decodedSlug)) {
    const payload = await getPayload({ config: configPromise })
    const published = post
      ? await payload.findByID({
          collection: 'blog',
          id: post.id,
          draft: false,
          overrideAccess: false,
          disableErrors: true,
        })
      : null
    metadata.robots = { index: false, follow: false }
    metadata.alternates = { canonical: published ? getDocumentURL('blog', published.slug) : null }
  }
  return metadata
}

const queryBlogEntryBySlug = cache(async ({ slug }: { slug: string }) => {
  const preview = await pagePreview((await getRequestSite()).site, 'blog', slug)
  const draft = Boolean(preview)

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'blog',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      ...(preview ? { id: { equals: preview.documentID } } : {}),
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
