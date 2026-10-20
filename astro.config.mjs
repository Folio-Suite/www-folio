// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import publication from './src/data/documentation.json' with { type: 'json' }
export default defineConfig({
  site: 'https://foliosuite.dev',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      customPages: [
        '/documentation/undokit/',
        ...publication.versions.map((version) => version.basePath),
      ].map((path) => new URL(path, 'https://foliosuite.dev').href),
      filter: (url) => !url.endsWith('/404/'),
    }),
  ],
  devToolbar: { enabled: false },
})
