<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# Static development website

The website targets `https://foliosuite.dev` and uses Astro's static output. Pages live in `src/pages/`; shared HTML and presentation live in `src/layouts/` and `src/styles/`. Ordinary pages ship HTML and CSS without a client framework. Static assets belong in Astro’s standard `public/` directory. `public/UndoKit/` is ignored generated output owned by the documentation preparer. Former local uploads, when present, are preserved in ignored `.legacy-local-media/`, outside the public tree.

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

`/feed.xml` is the RSS feed. Astro’s official sitemap integration emits `/sitemap-index.xml` and `/sitemap-0.xml`, including pages, published notes, and documentation roots. The official RSS helper generates the feed. Canonical URLs always use foliosuite.dev, including during local preview.

## API documentation

`pnpm dev` and `pnpm build` prepare `public/UndoKit/` before Astro runs. The preparer verifies every retained latest/version site hash and mount, copies only deployable sites plus shared navigation assets, and refuses invalid inputs before replacing existing output. See [API publication](documentation.md). Generated API pages remain ordinary files, so direct topic refreshes work on GitHub Pages without rewrites or a server.

## GitHub Pages

Astro supports static GitHub Pages deployment and a custom-domain `CNAME` file. This project uses `site: https://foliosuite.dev`, directory-style page URLs, and no repository-name base prefix. These settings are for the custom domain, not a `github.io/www-folio/` preview. [Astro deployment guide](https://docs.astro.build/en/guides/deploy/github/).

The `Static development website` workflow checks, formats, tests, and builds pushes and pull requests, then uploads the official Pages artifact. To publish from main, manually run it with **publish** enabled. The same repository deploys through `actions/deploy-pages` using the built-in `GITHUB_TOKEN`, `pages: write`, `id-token: write`, and the `github-pages` environment. There is no hosting repository checkout, deploy branch, or cross-repository token. Configure an environment reviewer if required.

The former root repository was inventoried at `Folio-Suite/folio-suite.github.io@9f91661f61f2a1981307a317f29655ecb64a36a5`: `index.html` and `style.css` are represented by the Astro home/layout/styles; `CNAME` and `.nojekyll` live in `public/`; its MIT `LICENSE` is preserved at the repository root; its README is superseded by this repository’s documentation. Its existing history remains available in that repository.

For the live cutover, first retain the old repository revision and Pages settings. Release `foliosuite.dev` from that repository’s Pages configuration, enable GitHub Actions Pages in `www-folio`, and assign `foliosuite.dev` to the new Pages site. Keep the organization’s domain verification. Existing DNS pointing at `folio-suite.github.io` should continue to target GitHub Pages, but verify the actual records, Pages domain check, HTTPS certificate, and redirect behavior before declaring success. Publish the reviewed main revision. Roll back by restoring the former Pages settings and domain if hosted acceptance fails; retain both repository histories. Do not delete or archive the former repository before acceptance. [GitHub custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Before the first cutover, review the generated artifact and verify locally with `pnpm preview`. The existing UndoKit project Pages deployment occupies `/UndoKit/` under the organization site; retire that separate deployment as part of the coordinated cutover so it cannot shadow the combined site's documentation subtree. Verify the live root, blog, assets, latest and numbered documentation, search, and deep-link refresh after switching. A local build or branch push is not proof of hosted acceptance.

No hosting settings, secrets, DNS records, or remote publication are changed by building this repository. `foliosuite.app` and Product hosting remain outside this implementation.
