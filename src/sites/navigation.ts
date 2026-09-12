import type { ArrayField } from 'payload'
import { link } from '@/fields/link'

export function navigationFields(rowLabel: string): ArrayField[] {
  return [
    ['navItems', 'Product navigation'],
    ['developmentNavItems', 'Development navigation'],
  ].map(([name, label]) => ({
    name,
    label,
    type: 'array',
    maxRows: 6,
    fields: [link({ appearances: false })],
    admin: { initCollapsed: true, components: { RowLabel: rowLabel } },
  }))
}

// Public globals may contain unresolved references when the target is unpublished.
export function publishedNavigation(items: import('@/payload-types').Header['navItems']) {
  return (items || []).filter(
    ({ link }) =>
      link.type !== 'reference' ||
      (link.reference?.value &&
        typeof link.reference.value === 'object' &&
        Boolean(link.reference.value.slug)),
  )
}
