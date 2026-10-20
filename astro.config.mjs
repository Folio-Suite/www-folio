// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { defineConfig } from 'astro/config'
export default defineConfig({
  site: 'https://foliosuite.dev',
  output: 'static',
  trailingSlash: 'always',
  publicDir: './.generated-public',
  devToolbar: { enabled: false },
})
