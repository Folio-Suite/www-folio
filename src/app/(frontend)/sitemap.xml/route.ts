import { getRequestSite } from '@/sites/request'
import { sites } from '@/sites/config'
import { getServerSideSitemapIndex } from 'next-sitemap'

export async function GET() {
  const { site } = await getRequestSite()
  return getServerSideSitemapIndex([
    `${sites[site].origin}/pages-sitemap.xml`,
    `${sites[site].origin}/blog-sitemap.xml`,
  ])
}
