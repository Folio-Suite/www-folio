import Link from 'next/link'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { CollectionArchive } from '@/components/CollectionArchive'
import { blogPageSize, blogSort, publishedBlogWhere } from './published'

export async function BlogListing({
  title,
  where,
  page = '1',
  path = '/blog',
}: {
  title: string
  where?: Where
  page?: string
  path?: string
}) {
  if (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page))) notFound()
  const payload = await getPayload({ config })
  const entries = await payload.find({
    collection: 'blog',
    where: { and: [publishedBlogWhere(), ...(where ? [where] : [])] },
    draft: false,
    overrideAccess: false,
    sort: blogSort,
    limit: blogPageSize,
    page: Number(page),
    depth: 2,
  })
  if (Number(page) > Math.max(1, entries.totalPages)) notFound()
  const pageURL = (number: number) =>
    path === '/blog'
      ? number === 1
        ? '/blog'
        : `/blog/page/${number}`
      : number === 1
        ? path
        : `${path}?page=${number}`
  return (
    <main className="h-feed container pt-24 pb-24">
      <h1 className="p-name text-4xl mb-8">{title}</h1>
      <nav aria-label="Blog navigation" className="flex flex-wrap gap-4 mb-8">
        <Link href="/blog">All entries</Link>
        <a href="/feed.xml">RSS</a>
        <a href="/feed.atom">Atom</a>
        <a href="/feed.json">JSON Feed</a>
      </nav>
      {!entries.totalDocs ? (
        <p>No published entries yet.</p>
      ) : (
        <CollectionArchive blog={entries.docs} />
      )}
      {entries.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex gap-6 mt-8">
          {Number(page) > 1 && (
            <Link rel="prev" href={pageURL(Number(page) - 1)}>
              Previous
            </Link>
          )}
          <span>
            Page {page} of {entries.totalPages}
          </span>
          {Number(page) < entries.totalPages && (
            <Link rel="next" href={pageURL(Number(page) + 1)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  )
}
