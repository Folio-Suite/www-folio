import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'
import { getRequestSite } from '@/sites/request'

export async function Header() {
  const [headerData, { site }] = await Promise.all([
    getCachedGlobal('header', 1)(),
    getRequestSite(),
  ])
  const data = {
    ...headerData,
    navItems: site === 'development' ? headerData.developmentNavItems : headerData.navItems,
    developmentNavItems: undefined,
  }

  return <HeaderClient data={data} />
}
