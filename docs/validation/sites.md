# Product and Development publication — issue #2

Review baseline: `a7b430672c6a258dbcdedf640a24b3c1841d8b2e`.
Primary implementation: `929941f`.

## Verified locally

- All 24 integration tests across 9 files passed. All 12 Chromium browser tests passed before review fixes.
- After review fixes, all 5 site browser tests passed; the affected integration files passed all 5 tests. The final encoded nested-redirect regression then passed with both `/legacy/caf%C3%A9` and `/legacy/100%25` sources.
- Browser coverage includes separate placeholder homes, matching page slugs, published-content filtering, navigation, cross-site references, canonicals, repeated sitemap requests, unknown hosts, and direct internal-route protection.
- CMS coverage follows the actual editor Preview link, previews Development on localhost, rejects unrelated drafts and invalid grants, and exercises public-domain handoff in a fresh browser context without login cookies. Exiting preview removes draft access.
- Regression coverage verifies that navigation does not serialize draft labels or slugs, unpublishing immediately removes a menu item, `/favicon-guide` remains routable, and each site resolves its own nested redirects.
- The migration smoke test applied the full chain from the original schema, authenticated the preserved administrator, preserved an existing page as Product, created a Development page with the same slug, and reran migration history without duplication.
- A production build passed on Node 24.21.0 against the migrated local database. The built server passed explicit HTTP Host checks for both domains: matching-slug content, canonical URLs, and page sitemaps stayed separate across alternating requests. Internal paths returned 404, unknown hosts returned 421, and local Development selection returned noindex/no-store headers.
- Final TypeScript and ESLint checks passed with zero lint warnings.

The initial production smoke harness used Node 26 fetch, which did not preserve its supplied Host header. Curl independently confirmed the Development response; the final harness uses `node:http` with explicit Host headers.

Application tests used Node 26.8.1; the production build and server used the configured Node 24 major. Browser coverage is Chromium. HTTPS partitioned-cookie iframe behavior has not been independently exercised on Vercel. Tests use disposable localhost databases `folio_test` and `folio_migrations_test`, with Blob and email credentials cleared.

## Independent review

Standards review identified an overly broad favicon exclusion and duplicated routing rules. Exact asset exclusions and shared path rules resolve those findings.

Spec review identified public navigation population bypassing access checks and nested redirects without a resolving route. Public global reads now enforce access, unresolved references are filtered, and navigation caches expire immediately on publication changes. A shared nested-path fallback resolves site-scoped redirects. The encoded-path follow-up was reproduced through HTTP before applying decode-once normalization; the regression now passes. Both reviewers resolved their findings; no actionable findings remain.

## Delivery boundary

The four Folio domains (`foliosuite.app`, `www.foliosuite.app`, `foliosuite.dev`, and `www.foliosuite.dev`) were confirmed on `ctwelvenet/www-folio`. No domain assignment, hosted schema, hosted content, or personal-project setting changed in this milestone. No push or deployment was performed.

Deploy with migration `20260912_024954_site_boundaries`; existing pages and redirects become Product. Verify actual hosted login and cross-domain preview after delivery. Reconcile duplicate site slugs before attempting to roll back to global uniqueness.

Blog, feeds, archives, and search remain the shared foundation until #4; Webmention boundaries remain #6. Real Folio media lifecycle validation is #3. Separately installed `.agents/` files and `skills-lock.json` remain outside the implementation commits.
