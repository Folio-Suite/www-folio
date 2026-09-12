import {
  convertLexicalToHTML,
  type HTMLConvertersFunction,
} from '@payloadcms/richtext-lexical/html'
import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import type { BlogEntry, BannerBlock, CodeBlock, MediaBlock, Media } from '@/payload-types'
import { getDocumentURL } from '@/utilities/getDocumentURL'
import { getServerSideURL } from '@/utilities/getURL'

export const escapeHTML = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )
export const absoluteContentURL = (value: string | null | undefined) => {
  if (!value) return undefined
  try {
    const url = new URL(value, getServerSideURL())
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

function renderMedia(media: Media | number | null | undefined, decorative = false): string {
  if (!media || typeof media !== 'object') return ''
  const url = absoluteContentURL(media.url)
  if (!url) return ''
  const caption = media.caption ? `<figcaption>${renderContent(media.caption)}</figcaption>` : ''
  if (media.mimeType?.startsWith('video/')) {
    return `<figure>${typeof media.poster === 'object' ? renderMedia(media.poster) : ''}<p><a href="${escapeHTML(url)}">${escapeHTML(media.title || 'Watch video')}</a></p>${media.description ? `<p>${escapeHTML(media.description)}</p>` : ''}${caption}</figure>`
  }
  return `<figure><img src="${escapeHTML(url)}" alt="${escapeHTML(decorative ? '' : media.alt)}"${media.width ? ` width="${media.width}"` : ''}${media.height ? ` height="${media.height}"` : ''}>${caption}</figure>`
}

type Nodes = DefaultNodeTypes | SerializedBlockNode<BannerBlock | CodeBlock | MediaBlock>
const converters: HTMLConvertersFunction<Nodes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  link: ({ node, nodesToHTML }) => {
    const children = nodesToHTML({ nodes: node.children }).join('')
    const reference = node.fields.doc
    const href =
      node.fields.linkType === 'internal'
        ? reference &&
          typeof reference.value === 'object' &&
          typeof reference.value.slug === 'string'
          ? getDocumentURL(reference.relationTo === 'blog' ? 'blog' : 'pages', reference.value.slug)
          : undefined
        : absoluteContentURL(node.fields.url)
    return href ? `<a href="${escapeHTML(href)}">${children}</a>` : children
  },
  upload: ({ node }) => (node.relationTo === 'media' ? renderMedia(node.value as Media) : ''),
  blocks: {
    banner: ({ node }) => `<aside>${renderContent(node.fields.content)}</aside>`,
    code: ({ node }) => `<pre><code>${escapeHTML(node.fields.code)}</code></pre>`,
    mediaBlock: ({ node }) => renderMedia(node.fields.media, node.fields.decorative || false),
  },
})

export function renderContent(data: BlogEntry['content']): string {
  return convertLexicalToHTML({ data, converters, disableContainer: true })
}
