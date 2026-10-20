<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# Canonical Astro maintenance audit

Periodic whole-repository pass, 2026-10-19. Starting revision: `4e690a6`, initially clean main checkout. Scope: all owned website source, tools, tests, configurations, documentation, static resources, dependency inventory, retained API artifacts, and the former organization-root website. This is maintenance evidence, not hosted acceptance or a release-readiness claim.

## Inventory and dispositions

| Category | Examined paths and finding | Disposition |
| --- | --- | --- |
| Architecture | All source/configuration call paths; Astro defaults and official blog conventions. Replaced custom `static/` and `publicDir` with `public/`; preparation owns only ignored `public/UndoKit/`, preserving ordinary neighboring assets. Replaced hand-written XML with official RSS and sitemap packages. Replaced the custom test-preview process wrapper with normal build/preview commands. | Fixed and verified. The documentation prep command is a deliberate exception for verified versioned DocC output. |
| Localization | All authored pages, Markdown, metadata, and navigation; `lang=en`, English copy, UTC display dates. No locale catalogs or other supported languages exist. | Pass for the declared English site; translation completeness is not applicable. Mobile layout and keyboard checks pass. |
| Resources | All five `public/` assets, both navigation assets, and the 22,117-file retained documentation tree. Original archive/site/producer hashes match manifests; deployable trees are independently checked before and after copying. No originals enter `dist/`. Former root license is preserved both at root and as a deployed legal notice. | Fixed and verified. Ignored legacy media, if present, is moved outside public; secrets remain untouched and ignored. |
| Imports and dependency direction | Every source/tool/test file listed below, all configuration imports, and Ruby requires. Imports resolve to used values/types or intentional CSS side effects. Pages depend on a shared layout/content policy and the publication registry; no CMS, application runtime, or browser UI framework remains. | Pass. Removed the obsolete XML helper and redundant Vitest environment annotation. |
| Dead code and prototypes | Reference inventory for all owned declarations/assets; `.header-link` and `.organization` CSS had no remaining markup. Removed the obsolete preview wrapper, custom sitemap endpoint, stale build-approval entries, and 542 tracked files of bundled generic agent skills plus their lockfile. No active website/agent guidance referenced that cache; global skills remain external. | Fixed and verified. Deliberately retained draft `welcome.md` is an authoring example, not an abandoned public page. Historical validation is labelled and preserved. |
| Diagnostics | Baseline Astro and formatting checks were clean. Final check/format and source diff reviewed; no new source diagnostics. | Pass. Tool subprocesses may emit the existing NO_COLOR/FORCE_COLOR environment notice; it is not a source warning. |
| Test health | All three test files; four integration tests exercise importer identity, immutable versions, failure recovery, and real export checks. Four Chromium tests exercise real built pages/DocC. Added neighboring-public-asset preservation and skip-link activation assertions. No skipped/focused tests or obsolete application fixtures remain. | Fixed and verified. No substitute mock was used for browser DocC acceptance. |
| Dependency inventory | `package.json`, lockfile, pnpm build permissions, TypeScript/formatter/test configuration; official Astro RSS and sitemap added with exact versions. Resolved graph inspected for retired application dependencies. | Pass; final registry audit recorded below. All output is static; no deployed package runtime or privacy manifest applies. Package license metadata is retained in the lock/install inventory; this is not a legal license audit or generated SBOM. |
| Documentation and tickets | All ten prior docs, README, CONTEXT, root AGENTS, source comments/examples, and hosting repository’s six-file root at `9f91661f61f2a1981307a317f29655ecb64a36a5`. Updated active paths, sitemap URLs, ownership, and publishing instructions. No tracker writes. | Fixed and verified. Historical evidence is retained with dated scope; no issue closure or remote backlog reconciliation is claimed. |
| Native/browser acceptance | Mobile root, keyboard skip/focus, canonical metadata, static HTTP routes, draft omission, feed escaping, DocC assets/search/version selection/deep refresh/fallback. | Pass for Chromium on this Mac. Safari, Firefox, assistive-technology sessions, live DNS/HTTPS, and hosted Pages were not exercised. Native app installation/synchronization checks do not apply to this static website. |

Owned source inventory (each examined for imports, use, and location):

- `src/content.config.ts`; `src/content/blog/{developer-resources,welcome}.md`.
- `src/layouts/Page.astro`; `src/lib/blog.ts`; `src/styles/site.css`.
- `src/pages/{index,about,documentation,404}.astro`; `src/pages/blog/{index,[...id]}.astro`; `src/pages/feed.xml.ts`.
- `src/documentation/assets/{selector.js,selector.css}`.
- `scripts/prepare-public.mjs`; `scripts/documentation/import.rb`.
- `tests/int/{documentation-import,static-docs}.int.spec.ts`; `tests/e2e/static-site.e2e.spec.ts`.
- `astro.config.mjs`, `playwright.config.ts`, `vitest.config.mts`, `tsconfig.json`, package/pnpm manifests, editor/formatter/ignore files, `.github/workflows/site.yml`, root guidance/license, and all `docs/` files.

Generated/vendor material is classified separately: retained DocC HTML/JSON/render bundles are integrity-checked inputs, not hand-maintained application source. Their minified code was not reformatted or subjected to an owned-source unused-import sweep. Existing original-data and immutable-version guarantees are preserved.

## Verification

- Node 24 and pinned pnpm; baseline and final Astro checks: zero errors/warnings/hints.
- Formatting and JavaScript syntax checks pass.
- Four integration tests and four Chromium tests pass on the final source; browser suite rebuilds `dist/` through standard commands.
- Original archive/site/producer checksums pass for UndoKit 0.2.0 and 0.2.2. No tracked documentation bytes changed.
- Dependency audit reports zero known advisories after adding the official integrations.
- The static output contains the domain file, legal notice, ordinary assets, current pages, RSS, sitemap index/shard, and verified Latest/archive docs. No Payload routes, local secrets/uploads, original archives, or draft page is published.
- The sandbox refused the initial local preview bind (`EPERM`); the same browser acceptance command passed outside the sandbox. This was execution access, not a source defect.

## Remaining work

**Live hosting consolidation — prepared at audit completion; subsequently completed.** See [cutover.md](cutover.md) for authorized production changes and hosted acceptance. The following describes the audit-time state. Source/assets/license are consolidated, and the workflow now deploys this repository’s official Pages artifact with the built-in token. The old repository still holds the live custom domain. Follow [the coordinated cutover and rollback](../sites.md#github-pages), including retirement of UndoKit’s separate project Pages deployment and live acceptance. No remote repository, Pages configuration, DNS, secret, publication, or hosted data was changed in this pass. Keep the old repository history until acceptance.

**Release-asset documentation pipeline — accepted design, deferred implementation.** The user agreed to generate docs once during UndoKit releases and consume pinned permanent assets during website builds. Current releases lack those bundles; expiring Actions artifacts are unsuitable. The raw archive and mount-specific static exports need a defined release contract, permanent publication, digest lockfile, and clean-cache/failure tests before removing the 162 MiB tracked snapshots. [Detailed handoff and prerequisites](../documentation.md#agreed-direction-release-assets-instead-of-tracked-output). This requires a coordinated UndoKit release-tooling change; existing snapshots are intentionally retained rather than deleted prematurely.

## Convention references

Compared against Astro’s [project structure](https://docs.astro.build/en/basics/project-structure/), [RSS recipe](https://docs.astro.build/en/recipes/rss/), [official sitemap integration](https://docs.astro.build/en/guides/integrations-guide/sitemap/), and [GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/). Direct Pages publishing uses GitHub’s [custom workflow contract](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). The site uses these conventions without adding unused starter-template components or sample public posts.

## Standards

Independent code-review axis for `fa42dcd...6e3aad6`: no actionable findings. Reviewed owned source, importer/exporter, configuration, workflow, licensing, and active documentation against repository guidance and the code-smell baseline. Hosted acceptance is excluded.

## Spec

Independent code-review axis for `fa42dcd...6e3aad6`: no actionable findings. Static pages/blog/API docs, consolidated source/publishing, canonical Astro conventions, and preservation of release evidence match the requested scope. Live cutover and the explicitly deferred permanent release-asset pipeline remain recorded follow-up work.

Review totals: Standards 0, Spec 0; neither axis has an outstanding actionable issue.
