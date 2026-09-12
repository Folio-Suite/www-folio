import { BlogListing } from '@/blog/Listing'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Blog | Folio Suite' }
export default async function Page({ params }: { params: Promise<{ pageNumber: string }> }) {
  return <BlogListing title="Blog" page={(await params).pageNumber} />
}
