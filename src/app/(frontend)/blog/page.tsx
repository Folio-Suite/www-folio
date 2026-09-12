import { BlogListing } from '@/blog/Listing'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Blog | Folio Suite' }
export default function Page() {
  return <BlogListing title="Blog" />
}
