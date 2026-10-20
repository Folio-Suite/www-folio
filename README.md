<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# Folio Suite development website

A static Astro site for **foliosuite.dev**: repository-managed pages, a Markdown development blog, and versioned API documentation. All published files are generated into `dist/`. Hosting needs no application server, database, CMS, or paid platform.

Use Node 24 and the pnpm version pinned in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The development server includes the prepared API documentation. `pnpm build` creates the complete static website; `pnpm preview` serves that production output locally. Run `pnpm check` and `pnpm test` before committing. Browser tests need `pnpm exec playwright install chromium`; tests build the real site into `.test-dist/` rather than the production output.

- [Content and GitHub Pages publishing](docs/sites.md)
- [API documentation import and provenance](docs/documentation.md)
- [Static migration validation](docs/validation/static-site.md)

Source belongs here. The existing `Folio-Suite/folio-suite.github.io` repository can remain the deployment destination for `foliosuite.dev`. Publishing is deliberately triggered; ordinary pushes build and test the site without changing production. Product-site work for `foliosuite.app` is outside this rebuild.

The previous Payload application remains recoverable in Git history through `f9778d4`. Local ignored secrets and uploads have not been deleted or imported into the static site. This migration does not export a hosted database or revoke external services; Vercel shutdown is handled separately.
