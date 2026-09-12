import { BlogListing } from '@/blog/Listing'
import { publishedBlogWhere } from '@/blog/published'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Author archive | Folio Suite' }
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({
    collection: 'blog',
    overrideAccess: false,
    where: { and: [publishedBlogWhere(), { authors: { equals: Number(id) } }] },
  })
  if (!totalDocs) notFound()
  const author = await payload.findByID({
    collection: 'users',
    id: Number(id),
    depth: 0,
    overrideAccess: true,
    select: { name: true },
    disableErrors: true,
  })
  if (!author?.name) notFound()
  return (
    <BlogListing
      title={author.name}
      path={`/blog/author/${id}`}
      where={{ authors: { equals: Number(id) } }}
      page={(await searchParams).page}
    />
  )
}
