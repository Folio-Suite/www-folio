<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# Folio Suite development website

A static Astro site for **foliosuite.dev**: repository-managed pages, a Markdown development blog, and versioned API documentation. Generated documentation is stored in permanent release assets, with only its lockfile and build tooling tracked here. All published files are generated into `dist/`. Hosting needs no application server, database, CMS, or paid platform.

Use Node 24 and the pnpm version pinned in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The first build downloads digest-pinned API documentation release assets into an ignored cache; the development server includes the verified static exports. `pnpm build` creates the complete static website; `pnpm preview` serves that production output locally. Run `pnpm check` and `pnpm test` before committing. Browser tests need `pnpm exec playwright install chromium`; tests build and serve the real production output in `dist/`.

- [Content and GitHub Pages publishing](docs/sites.md)
- [API documentation import and provenance](docs/documentation.md)
- [Hygiene audit and remaining decisions](docs/validation/hygiene.md)
- [Static migration validation](docs/validation/static-site.md)

Source and GitHub Pages publishing both belong here. The former `Folio-Suite/folio-suite.github.io` root has been consolidated into this site; the live domain now deploys from www-folio, with [hosted acceptance recorded](docs/validation/cutover.md). Publishing is deliberately triggered; ordinary pushes build and test the site without changing production. Product-site work for `foliosuite.app` is outside this rebuild.

The previous Payload application remains recoverable in Git history through `f9778d4`. Local ignored secrets and uploads have not been deleted or imported into the static site. This migration does not export a hosted database or revoke external services; Vercel shutdown is handled separately.
