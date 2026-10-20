<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

> Historical validation of the retired Payload/Next.js implementation. Current validation is in [static-site.md](static-site.md).

# Common publishing foundation — issue #1

Review baseline: `b556ed14c675e52a725b1dbb064a1a72de55f920` (the clean Folio template).
Source foundation: personal-site commit `250940ea88b673ca1dc7de110131dfaa2981d3cb`.

## Verified locally

- The new homepage regression first failed on the template title, then passed with Folio identity and the empty-state Blog link.
- ESLint passed with zero warnings; generated Next route types and TypeScript passed.
- All 23 integration tests passed, covering Blog behavior, media rendering/storage policy, themes, link behavior, and Webmention interfaces.
- All 8 Chromium browser tests passed, covering homepage, admin login/navigation, published Blog routes, metadata, archives, and RSS/Atom/JSON feeds.
- The migration smoke test initialized an empty database using the original migration, inserted an administrator in that original schema, applied the remaining migrations, and authenticated that administrator through Payload. Blog and media remained empty. Rerunning migrations created no duplicate history entries.
- A production build passed on Node 24.21.0 against the migrated local database with Blob/email credentials cleared. Post-build sitemap generation used `https://foliosuite.app`.
- Independent Standards review found no actionable issues. Spec review found a stale ICO reference; removal was verified and the finding resolved.

Application tests ran on the workstation's Node 26.8.1; the production build used the configured Node 24 major. Browser coverage is Chromium. Tests use `folio_test`; migration/build validation uses `folio_migrations_test`. Both are disposable localhost databases, separate from the personal test database and hosted services.

## Delivery and remaining scope

No hosted database migration, cloud Blob lifecycle test, push, or deployment was performed for this milestone. The provisioned administrator's preservation is supported by the local upgrade fixture; actual hosted login must be checked after delivery. The Folio `.env.local` and Vercel project linkage were preserved. Separately installed `.agents/` skill files and `skills-lock.json` remain outside these commits.

Both domains currently serve this common foundation. Site boundaries and previews are #2; real Folio media lifecycle verification is #3; scoped blogs/feeds are #4; editorial docs are #5; scoped Webmentions are #6; manual DocC publication is #7. Resend was subsequently connected for Production and Preview, with `foliosuite.dev` as the sender domain; local development still has no email key. Email delivery has not been exercised by sending a message. Cron recovery requires `CRON_SECRET`.
