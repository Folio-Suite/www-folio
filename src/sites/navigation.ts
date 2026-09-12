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
