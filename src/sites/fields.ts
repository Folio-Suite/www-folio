import type { SelectField } from 'payload'
import { sites } from './config'

export const siteField: SelectField = {
  name: 'site',
  label: 'Destination',
  type: 'select',
  required: true,
  defaultValue: 'product',
  options: [
    { label: 'Product — foliosuite.app', value: 'product' },
    { label: 'Development — foliosuite.dev', value: 'development' },
  ],
  admin: {
    position: 'sidebar',
    description: `Choose the ${sites.product.label} or ${sites.development.label} site.`,
  },
}
