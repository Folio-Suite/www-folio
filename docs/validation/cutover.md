<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# foliosuite.dev Pages cutover

> Subsequent artifact-pipeline and canonical-URL work is recorded in [artifact-pipeline.md](artifact-pipeline.md). This record describes the initial production cutover.

Completed October 19, 2026 (America/Chicago), with explicit user authorization to perform the live cutover.

## Deployment

The production artifact was built and deployed from `1ce54ece1440cf4e775b5cf61b5eb74a6d0b9901` by [Actions run 39360183350](https://github.com/Folio-Suite/www-folio/actions/runs/39360183350). Its build and publish jobs succeeded: frozen dependency installation, Astro checking, formatting, four integration tests, four Chromium tests, production build, official Pages artifact upload, and deployment. The subsequent importer-only correction `d0b97c7` excludes Ruby dot-directory aliases from future inventories; it does not change the deployed website bytes. Its full hosted validation also passed in [run 39360591004](https://github.com/Folio-Suite/www-folio/actions/runs/39360591004), with publication correctly skipped for an ordinary push.

The first hosted build found that Git omits empty DocC directories although producer checksums include them. The tracked `empty-directories.json` now restores those directories before validation. Regression coverage removes the directories from a copied checkout and verifies restoration and export through the real command. The importer refreshes the inventory for future releases. No original artifact bytes or expected checksums were changed.

## Configuration before and after

| Setting | Before | After |
| --- | --- | --- |
| `www-folio` Pages | Not configured | GitHub Actions workflow; custom domain `foliosuite.dev` |
| `folio-suite.github.io` Pages | Legacy `main:/`, custom domain `foliosuite.dev` | Legacy `main:/`, no custom domain; remains available at the organization GitHub URL |
| UndoKit Pages | Separate workflow deployment under `/UndoKit/` | Separate Pages site deactivated; repository, release assets, and snapshot branch preserved |
| Domain and TLS | Verified domain, approved certificate, HTTPS enforced | Verified domain, approved certificate, HTTPS enforced on `www-folio` |
| DNS | Four GitHub Pages IPv4 addresses | Unchanged |

GitHub refused to deactivate the organization-root Pages site (HTTP 422, “Deactivating GitHub pages for this repository is not allowed”). Releasing its custom domain succeeded instead; GitHub removed that repository’s `CNAME` file automatically. No repository was deleted or archived. Original organization-root content is retained at `9f91661f61f2a1981307a317f29655ecb64a36a5`. Root Pages settings were saved before mutation: legacy build, main branch, root path, `foliosuite.dev`, HTTPS enforced. UndoKit’s previous configuration was workflow Pages, no custom domain, main/root source.

No DNS records, organization domain verification, credentials, billing, Vercel settings, or `foliosuite.app` configuration were changed.

## Hosted acceptance

Verified after the routing transfer:

- `https://foliosuite.dev/` returns the new Astro homepage, including development notes and Latest 0.2.2.
- Blog index and `/blog/developer-resources/`, RSS, sitemap index, favicon, and the emitted stylesheet return HTTP 200 with appropriate content types.
- HTTP root redirects to HTTPS with 301; the Pages API reports HTTPS enforcement, verified ownership, and an approved certificate for `foliosuite.dev` and `www.foliosuite.dev`.
- Latest and 0.2.0 archived HistorySession deep links return 200. Shared selector JavaScript and publication registry return 200; the registry identifies Latest as 0.2.2.
- The live in-app browser renders DocC, switches Latest to 0.2.0, opens and refreshes the archived HistorySession topic, and filters the real documentation navigator for `HistorySession` (66 matching items).
- Missing pages, the draft authoring template, and retained original release evidence paths return 404.
- `UndoKit/pages` returns 404, confirming its separate site is deactivated. The old root site no longer claims the custom domain.

This is hosted acceptance for the observed routes/browser, not exhaustive cross-browser or regional CDN validation. Retained documentation content is unchanged; historical guidance inside those releases remains version-specific.

## Recovery and remaining work

To return the domain to the former root, release its custom domain from `www-folio`, then assign `foliosuite.dev` back to `folio-suite.github.io` and enforce HTTPS. Its original main-branch site history remains recoverable. Re-enabling the former separate UndoKit Pages deployment would require its prior workflow configuration and an explicit publication of its retained snapshot content; do not invoke old promotion workflows casually after this consolidation.

Future website publication remains an explicit main-branch workflow dispatch with `publish=true`; ordinary pushes only validate. The agreed permanent UndoKit release-asset pipeline is still a separate coordinated implementation, described in [documentation.md](../documentation.md#agreed-direction-release-assets-instead-of-tracked-output).
