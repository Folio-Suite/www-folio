import { BlogListing } from '@/blog/Listing'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const category = (
    await payload.find({
      collection: 'categories',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: false,
    })
  ).docs[0]
  if (!category) notFound()
  return (
    <BlogListing
      title={category.title}
      path={`/blog/category/${encodeURIComponent(slug)}`}
      where={{ categories: { equals: category.id } }}
      page={(await searchParams).page}
    />
  )
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `Category: ${slug} | Folio Suite` }
}
