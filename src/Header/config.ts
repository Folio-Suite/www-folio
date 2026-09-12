import type { GlobalConfig } from 'payload'

import { navigationFields } from '@/sites/navigation'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  fields: navigationFields('@/Header/RowLabel#RowLabel'),
  hooks: {
    afterChange: [revalidateHeader],
  },
}
