# Folio Suite websites

Shared publishing foundation for `foliosuite.app` (product and user help) and `foliosuite.dev` (development notes and technical documentation).

## Current milestone

The clean template is reconciled with the tested publishing base from `ctwelve/www-personal` at commit `250940ea88b673ca1dc7de110131dfaa2981d3cb`. The Folio repository retains its own history, administrator account, configuration, and services.

Product and Development now have separate page destinations, route trees, navigation, canonical identity, sitemaps, and authenticated previews. See [site operation and architecture](docs/sites.md). Domain-scoped Blog behavior remains #4 and Webmentions remain #6. Repository specification publication is deferred. Manual DocC publication is tracked in #7.

UndoKit API documentation is imported from verified release artifacts and integrated into the Development site. `/UndoKit/` opens the explicitly promoted latest release; the version selector opens retained release snapshots. See [documentation publication](docs/documentation.md) for import, provenance, validation, and cutover instructions.

## Development

Use Node 24 and the pinned pnpm version. Run `pnpm install`, then `pnpm dev`. The ignored `.env.local` contains the Folio development configuration; preserve its integration-managed values. Set `NEXT_PUBLIC_SERVER_URL=http://localhost:3000` for local development. Local development defaults to Product; append `?site=development` to view Development. Public hosts select their own site.

The common base includes Blog publishing, public author profiles, article metadata, durable published-slug redirects, RSS/Atom/JSON feeds, archives, microformats, moderated incoming Webmentions, durable outgoing deliveries, and image/video publishing. Reconciliation does not assign any personal account handle to a Folio author.

Uploaded originals and derivatives use `media/`. Supported images are JPEG, PNG, WebP, AVIF, and GIF; videos are MP4 and WebM, with a 100 MiB upload limit. Videos are not transcoded. Media supports captions, decorative images, video posters, descriptions, and labelled WebVTT tracks; cross-origin caption sources need CORS. Chromium is the verified browser baseline.

## Email and background work

Resend is connected to the Folio project's Production and Preview environments. Payload uses the integration's `RESEND_API_KEY` and sends as `Folio Suite <webmaster@foliosuite.dev>` by default. The sender domain follows `RESEND_EMAIL_DOMAIN`; `EMAIL_FROM_ADDRESS` overrides the entire address and `EMAIL_FROM_NAME` overrides the display name. Local development has no email key by default. No personal-site email credentials or sender identity are inherited.

Webmention jobs persist in Payload. Next.js post-response work starts them; the authenticated daily Cron is a recovery path and requires `CRON_SECRET`. Failures have bounded retries and an admin retry control. Daily Cron recovery may delay retries until the next run. Public verification uses URL/DNS validation, redirect/time/size bounds, and durable submission limits.

## Tests

Tests always override deployment credentials and target an isolated localhost database named `folio_test`. With the local test PostgreSQL service on port 54329, its connection is `postgresql://website_test:local-test-only@127.0.0.1:54329/folio_test`. `TEST_DATABASE_URL` may override this only with another localhost database ending in `_test`. This database is separate from the personal project's test database and both projects' hosted environments.

Run `pnpm test:int`, `pnpm test:e2e`, `pnpm lint`, and `pnpm exec tsc --noEmit`. Browser tests reserve port 3000; install Chromium with `pnpm exec playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing test browser.

The optional real-Blob smoke checks require a localhost database and an explicitly verified `FOLIO_TEST_BLOB_STORE_ID` matching `BLOB_STORE_ID`. They create and remove their own test fixtures. Verify that store is development-only before running them. Never run smoke checks using the personal site's store or a production store.

## Migrations and deployment

The existing initial migration is preserved, followed by the tested Blog/media/author/Webmention schema migrations. The Blog migration discards old template Posts, so apply it only to the agreed clean Folio installation. User accounts and integration settings remain in place. CI runs migrations before the production build; preview and development environments must use their intended isolated databases.

Schema push is disabled by default, including development against hosted databases. Use migrations for hosted environments. The isolated localhost test harness explicitly enables schema push for its disposable database.

The migration smoke check uses a separate empty localhost database named `folio_migrations_test`: set `TEST_DATABASE_URL` to its connection string and run `node --import=tsx tests/smoke/migrations.mts`. It verifies initialization, upgrade, preserved administrator login, and migration reruns.

Treat the code and schema upgrade as one release. Verify admin login, a clean homepage, Blog publishing, feeds, and media after deploying. No seeded content, seed endpoint, or welcome components are retained.

## Engineering workflow

Read `AGENTS.md` and `docs/agents/` before ticket work. Claim a ticket when implementation starts; queued tickets stay unassigned. Issues live in `Folio-Suite/www-folio`.
