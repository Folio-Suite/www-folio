'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { pagePath, pageURL, type Site } from './config'

type SiteContextValue = { site: Site; previewHost: boolean }
const Context = createContext<SiteContextValue>({ site: 'product', previewHost: false })
export function SiteProvider({ children, ...value }: SiteContextValue & { children: ReactNode }) {
  return <Context value={value}>{children}</Context>
}
export const useSite = () => useContext(Context)
export function pageLink(site: Site, slug: string | null | undefined, current: SiteContextValue) {
  const path = pagePath(slug)
  if (site === current.site) return path
  return current.previewHost ? `${path}?site=${site}` : pageURL(site, slug)
}
