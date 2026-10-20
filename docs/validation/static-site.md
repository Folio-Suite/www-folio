<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# Static Development website validation

Validated October 19, 2026. Implementation replaces the Payload/Next.js application at baseline `f9778d43b6b5f7615ce98cb1eaa1004e92d0f785` with Astro 7.4.1 static output for foliosuite.dev. Product-site implementation is outside this rebuild.

## Source and output

The application source, CMS/admin/API routes, database models and migrations, Webmention services, Vercel configuration, React components, and obsolete application tests are removed. Runtime dependencies consist of Astro as the build framework; deployment serves ordinary files and has no database or application-server requirement. Local ignored secrets/uploads were preserved and are outside the static asset pipeline.

The build includes the home page, About page, documentation index, Markdown dev-blog index and articles, RSS, sitemap, robots, favicon, custom 404, CNAME, and `.nojekyll`. A brief starter article provides resource links; the authoring template remains a draft. The home page reuses the existing organization root's licensed visual identity.

UndoKit 0.2.0 and 0.2.2 retained artifacts are unchanged from the baseline. Latest remains 0.2.2. The exporter verifies imported website mounts and tree hashes before copying, verifies copied trees again, and publishes only the static site trees, registry, shared navigation assets, and legacy Latest entry. Original release archives and evidence manifests stay in the repository, outside the public artifact. The complete `dist/` tree is approximately 74 MiB.

## Checks

- Node 24.19.0 and pnpm 11.25.0; dependency graph was installed cleanly rather than inheriting optional peers from the retired application.
- `pnpm check`: zero Astro errors, warnings, or hints; JavaScript pipeline scripts pass Node syntax checking.
- `pnpm format:check`: passes.
- Full `pnpm test`: four integration tests and four Chromium browser tests pass. No database, hosted credentials, or running external service is used.
- Integration tests cover original import identity/tamper rejection, retained-version preservation, transform failure preservation, deployable static export, invalid registry rejection, and preserving prior export after invalid/tampered input.
- Browser checks use the actual static site and real retained DocC exports. They cover the root, regular pages, navigation, mobile width, keyboard focus, Markdown article rendering, canonical URLs, draft exclusion from routes/index/feed/sitemap, XML escaping, real DocC assets/search/version switching, direct topic refresh, missing-topic fallback, and the legacy Latest entry.
- `pnpm build`: passes; six HTML pages plus XML endpoints and API output. Production output excludes the draft template and includes `.nojekyll` and `CNAME`.
- An independent Python static HTTP server served the production root, Markdown article, and DocC deep link in Chromium. It reported zero failed asset requests or page errors. Full desktop (1280 pixels) and mobile (390 pixels) screenshots were inspected, with no document-level horizontal overflow.
- Retained `documentation/` artifacts have no changes against the baseline.

## Review

Standards: no actionable findings. Spec: no actionable findings. Both reviews compared the static-site implementation with `f9778d4` and the user's revised scope of a simple Development site with pages, a dev blog, and API documentation.

## Deployment boundary

The workflow builds/tests source changes and retains a static artifact; publication requires a deliberate main-branch dispatch. It targets the existing `Folio-Suite/folio-suite.github.io` hosting repository's `gh-pages` branch, using a restricted environment token. No workflow, hosting-setting change, remote publication, DNS update, or shutdown of UndoKit's separate Pages deployment was performed during this implementation. Follow [publishing and cutover](../sites.md#github-pages), including the existing project-site shadowing consideration, before claiming hosted acceptance.
