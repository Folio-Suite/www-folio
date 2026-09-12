import { getRequestSite } from '@/sites/request'
import { sites } from '@/sites/config'

export async function GET() {
  const { site, previewHost } = await getRequestSite()
  return new Response(
    previewHost
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nDisallow: /admin/\nDisallow: /sites/\nSitemap: ${sites[site].origin}/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain' } },
  )
}
