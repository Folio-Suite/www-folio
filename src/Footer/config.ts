import type { GlobalConfig } from 'payload'

import { navigationFields } from '@/sites/navigation'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: navigationFields('@/Footer/RowLabel#RowLabel'),
  hooks: {
    afterChange: [revalidateFooter],
  },
}
