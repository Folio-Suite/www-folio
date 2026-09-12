import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { SiteProvider } from '@/sites/Context'
import { sites } from '@/sites/config'
import { getRequestSite } from '@/sites/request'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const destination = await getRequestSite()

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable)} lang="en" suppressHydrationWarning>
      <head>
        <InitTheme />
        <link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Atom" href="/feed.atom" />
        <link rel="alternate" type="application/feed+json" title="JSON Feed" href="/feed.json" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        {/* Vercel Analytics and Speed Insights scripts */}
        <SpeedInsights />
        <Analytics />
      </head>
      <body>
        <SiteProvider {...destination}>
          <Providers>
            <AdminBar
              adminBarProps={{
                preview: isEnabled,
              }}
            />

            <Header />
            {children}
            <Footer />
          </Providers>
        </SiteProvider>
      </body>
    </html>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const { site, previewHost } = await getRequestSite()
  return {
    metadataBase: new URL(sites[site].origin),
    title: sites[site].name,
    description: sites[site].description,
    openGraph: mergeOpenGraph({
      siteName: sites[site].name,
      title: sites[site].name,
      description: sites[site].description,
      url: sites[site].origin,
    }),
    robots: previewHost ? { index: false, follow: false } : undefined,
    twitter: { card: 'summary_large_image' },
  }
}
