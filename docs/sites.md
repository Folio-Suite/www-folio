# Product and Development sites

Pages have a required Destination: Product (`foliosuite.app`) or Development (`foliosuite.dev`). Existing pages and redirects become Product during the migration. Each site reserves its own page slugs and redirect sources, so both may publish `/about`. Website routes such as `/blog`, `/admin`, and the internal routing namespace cannot be used as page slugs. Page slugs cannot contain dots, percent signs, slashes, query strings, or fragments.

Header and Footer each expose separate Product and Development navigation lists. Reference links use the target page's destination, including rich-text links. Public page metadata, canonical URLs, robots, and page sitemaps use the selected site's public origin. Blog content and subscriptions still share the common foundation until #4; Webmention site boundaries remain #6.

## Routing and layouts

The `/UndoKit` namespace is reserved for generated API documentation and unavailable on the Product destination. A separate route handler serves the DocC application without the editorial React layout. Latest topics live under `/UndoKit/documentation/undokit/`; retained releases use `/UndoKit/versions/<version>/documentation/undokit/`. Source generation remains in UndoKit; this repository imports and transforms selected artifacts. See [documentation publication](documentation.md).

The shared `(frontend)` layout hosts common providers, navigation, analytics, and typography. Under it, `(frontend-app)/sites/product` and `(frontend-dev)/sites/development` have separate layout entry points. Both use the shared page renderer in `src/sites/Page.tsx`.

Next.js Proxy chooses a site from the request Host and rewrites public page URLs into those internal route trees. The browser keeps the public URL. Direct external requests to `/sites/...` return 404. A shared fallback resolves site-scoped nested redirects; sources owned by CMS/API or specialized Blog routes are rejected. Unrecognized hosts return 421. Public apex and `www` hosts choose their own site even when a query or cookie requests the other site. Canonicals use the apex domain.

Localhost and the current deployment, branch, and project Vercel hostnames support `?site=product` or `?site=development`. The selection persists on that host; cross-site reference links retain the preview host and change the selection. Preview hosts are private/no-store and noindex. Public page rendering is dynamic; no full-route cache can reuse one domain's HTML for another. The page sitemap cache includes its Site argument, and the shared global cache includes lookup depth. Public global reads enforce publication access, and unresolved references are removed before navigation reaches the client. Menu edits and publication changes immediately expire navigation caches. Selected navigation alone is passed to its client component.

Both domains and their `www` aliases were verified on the Vercel project `ctwelvenet/www-folio`; personal domains were not changed.

## Preview access

The CMS preview link names a collection and document ID. Its first request requires an authenticated editor and resolves the actual document destination. It issues a signed 15-minute grant containing the destination, collection, document ID, slug, editor ID, and editor origin. Public-domain previews hand off to the correct public domain; deployment previews remain on the deployment host.

The destination validates the grant and establishes draft access without needing a production-domain login cookie. The grant is restricted to that document and site. HTTPS grants use a Secure, HttpOnly, SameSite=None partitioned cookie; localhost uses a development cookie. Preview pages identify their destination, are noindex, and refresh from the issuing editor origin. Exiting preview clears draft mode and the grant. A grant is a temporary bearer capability; never log or share its URL. Email is not involved.

The shared editorial workspace is trusted; Destination separates publication audiences, not editor permissions. All authenticated editors can edit both destinations.

## Migration and operation

Deploy the code with `20260912_024954_site_boundaries`. It adds site fields, replaces global slug/source uniqueness with compound site constraints, and adds Development navigation. It preserves existing administrators and pages. Rolling this migration back after both sites publish matching slugs requires reconciling those duplicates first; the former schema cannot represent them.

Use the normal isolated integration/browser tests and `tests/smoke/migrations.mts`. The migration smoke test also checks existing Product pages and a matching Development slug. No hosted schema or content is modified by those tests.
