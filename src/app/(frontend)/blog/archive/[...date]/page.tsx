import { BlogListing } from '@/blog/Listing'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Date archive | Folio Suite' }
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ date: string[] }>
  searchParams: Promise<{ page?: string }>
}) {
  const { date } = await params
  const [year, month] = date
  if (
    date.length > 2 ||
    !/^\d{4}$/.test(year) ||
    Number(year) < 1900 ||
    (month && !/^(0[1-9]|1[0-2])$/.test(month))
  )
    notFound()
  const start = new Date(Date.UTC(Number(year), month ? Number(month) - 1 : 0, 1))
  const end = new Date(Date.UTC(Number(year) + (month ? 0 : 1), month ? Number(month) : 0, 1))
  const title = month
    ? start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : year
  return (
    <BlogListing
      title={title}
      path={`/blog/archive/${date.join('/')}`}
      where={{
        publishedAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() },
      }}
      page={(await searchParams).page}
    />
  )
}
