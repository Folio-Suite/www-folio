import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideURL } from '@/utilities/getURL'
import { getDocumentURL } from '@/utilities/getDocumentURL'
import { siteName, siteDescription } from '@/utilities/site'
import { escapeHTML as xml, renderContent } from './content'
import { blogSort, publishedBlogWhere } from './published'

export async function feedResponse(format: 'rss' | 'atom' | 'json'): Promise<Response> {
  const origin = getServerSideURL()
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'blog',
    overrideAccess: false,
    draft: false,
    where: publishedBlogWhere(),
    sort: blogSort,
    limit: 50,
    depth: 3,
  })
  const items = result.docs.map((doc) => ({
    id: `${origin}/blog#entry-${doc.id}`,
    url: getDocumentURL('blog', doc.slug),
    title: doc.title,
    content_html: renderContent(doc.content),
    date_published: doc.publishedAt || undefined,
    date_modified: doc.updatedAt,
    authors: doc.populatedAuthors
      ?.filter((author) => author.name)
      .map((author) => ({
        name: author.name!,
        url: author.twitterHandle ? `https://x.com/${author.twitterHandle.slice(1)}` : undefined,
      })),
  }))
  const headers = {
    'Cache-Control': 'no-cache',
    'Content-Type':
      format === 'json'
        ? 'application/feed+json; charset=utf-8'
        : format === 'atom'
          ? 'application/atom+xml; charset=utf-8'
          : 'application/rss+xml; charset=utf-8',
  }
  if (format === 'json')
    return Response.json(
      {
        version: 'https://jsonfeed.org/version/1.1',
        title: siteName,
        description: siteDescription,
        home_page_url: origin,
        feed_url: `${origin}/feed.json`,
        items,
      },
      { headers },
    )
  let body: string
  if (format === 'rss') {
    body = `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(siteName)}</title><link>${xml(origin)}</link><description>${xml(siteDescription)}</description><atom:link href="${xml(origin)}/feed.xml" rel="self" type="application/rss+xml"/>${items.map((item) => `<item><guid isPermaLink="false">${xml(item.id)}</guid><link>${xml(item.url)}</link><title>${xml(item.title)}</title>${item.date_published ? `<pubDate>${new Date(item.date_published).toUTCString()}</pubDate>` : ''}${item.authors?.map((author) => `<dc:creator>${xml(author.name)}</dc:creator>`).join('') || ''}<atom:updated>${xml(item.date_modified)}</atom:updated><content:encoded>${xml(item.content_html)}</content:encoded></item>`).join('')}</channel></rss>`
  } else {
    const updated = items.reduce(
      (latest, item) => (item.date_modified > latest ? item.date_modified : latest),
      '1970-01-01T00:00:00.000Z',
    )
    body = `<feed xmlns="http://www.w3.org/2005/Atom"><id>${xml(origin)}/blog</id><title>${xml(siteName)}</title><author><name>${xml(siteName)}</name><uri>${xml(origin)}</uri></author><updated>${updated}</updated><link rel="self" href="${xml(origin)}/feed.atom"/><link href="${xml(origin)}/blog"/>${items.map((item) => `<entry><id>${xml(item.id)}</id><title>${xml(item.title)}</title><link href="${xml(item.url)}"/><updated>${item.date_modified}</updated>${item.date_published ? `<published>${item.date_published}</published>` : ''}${item.authors?.map((author) => `<author><name>${xml(author.name)}</name>${author.url ? `<uri>${xml(author.url)}</uri>` : ''}</author>`).join('') || ''}<content type="html">${xml(item.content_html)}</content></entry>`).join('')}</feed>`
  }
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, { headers })
}
