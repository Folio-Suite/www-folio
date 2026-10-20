<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# Static development website

The website targets `https://foliosuite.dev` and uses Astro's static output. Pages live in `src/pages/`; shared HTML and presentation live in `src/layouts/` and `src/styles/`. Ordinary pages ship HTML and CSS without a client framework. Static assets belong in `static/`, which is copied into the prepared public directory. Old ignored `public/media` uploads are outside that pipeline.

The root reuses the visual identity and project links from `Folio-Suite/folio-suite.github.io`. Its UndoKit release label comes from the retained publication registry rather than a manually maintained version string. `/documentation/` lists available API references. `/404.html` provides the static-host error page.

## Development blog

Add Markdown under `src/content/blog/`. Filenames determine `/blog/<filename>/` URLs. Nested folders are supported. Front matter requires `title`, `description`, and `pubDate`; `author` is optional. `draft` defaults to false. `welcome.md` is an unpublished starter template, not a public announcement.

```yaml
---
title: "An implementation note"
description: "A short description of the work."
pubDate: 2026-10-19
author: "Author name"
draft: true
---
```

Set `draft: false` when ready. Drafts and future-dated posts are omitted from the home page, blog index, article routes, RSS feed, and sitemap. Dates display in UTC. Published posts sort newest first; equal dates sort by filename. A scheduled post requires a rebuild after its publication date; this static site has no background scheduler.

`/feed.xml` is the RSS feed. `/sitemap.xml` includes pages, published notes, and documentation roots. Canonical URLs always use foliosuite.dev, including during local preview.

## API documentation

`pnpm dev` and `pnpm build` prepare `.generated-public/` before Astro runs. The preparer verifies every retained latest/version site hash and mount, copies only deployable sites plus shared navigation assets, and refuses invalid inputs before replacing existing output. See [API publication](documentation.md). Generated API pages remain ordinary files, so direct topic refreshes work on GitHub Pages without rewrites or a server.

## GitHub Pages

Astro supports static GitHub Pages deployment and a custom-domain `CNAME` file. This project uses `site: https://foliosuite.dev`, directory-style page URLs, and no repository-name base prefix. These settings are for the custom domain, not a `github.io/www-folio/` preview. [Astro deployment guide](https://docs.astro.build/en/guides/deploy/github/).

The `Static development website` workflow builds, checks, and tests pushes and pull requests, then retains the full `dist/` artifact. To publish from main, manually run it with **publish** enabled. Publication uses the `development-pages` environment and the environment secret `DEVELOPMENT_PAGES_TOKEN`, a fine-grained token with Contents read/write access only to `Folio-Suite/folio-suite.github.io`. Configure an environment reviewer if required. The normal source-repository `GITHUB_TOKEN` cannot push to that second repository.

The publisher updates only the hosting repository's `gh-pages` branch, preserving its history and its existing main branch. Configure that repository's Pages source to deploy from `gh-pages`, root directory, after its first publication creates the branch. The output includes `.nojekyll` and `CNAME` for foliosuite.dev. No DNS change is needed merely to change that existing repository's publishing branch.

Before the first cutover, review the generated artifact and verify locally with `pnpm preview`. The existing UndoKit project Pages deployment occupies `/UndoKit/` under the organization site; retire that separate deployment as part of the coordinated cutover so it cannot shadow the combined site's documentation subtree. Verify the live root, blog, assets, latest and numbered documentation, search, and deep-link refresh after switching. A local build or branch push is not proof of hosted acceptance.

No hosting settings, secrets, DNS records, or remote publication are changed by building this repository. `foliosuite.app` and Product hosting remain outside this implementation.
