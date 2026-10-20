<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# Artifact-based documentation validation

October 19, 2026. Implements the agreed replacement of tracked generated documentation with permanent release assets, and the shorter DocC canonical route. Only UndoKit 0.2.2 is adopted; 0.2.0 is intentionally omitted from this first serious rollout and remains recoverable in earlier Git history.

## Canonical source and artifacts

The website source tracks `src/data/documentation.json` (under 1 KiB), transformation/download tools, and website-owned navigation. The former 22,118-file, approximately 162 MiB `documentation/undokit/` store is removed. Builds use a disposable ignored cache; generated content is not committed.

Permanent assets:

- [Original UndoKit documentation](https://github.com/Folio-Suite/UndoKit/releases/tag/0.2.2), asset `UndoKit-0.2.2-documentation.tar.gz`: SHA-256 `86f8e95f2c1e8e2ddabe9214bc79d4ef6885d5934f06635c29310b305ab2845a`.
- [Website artifact](https://github.com/Folio-Suite/www-folio/releases/tag/undokit-docs-0.2.2-site-v1), asset `UndoKit-0.2.2-website.tar.gz`: SHA-256 `2ca8098e79b87949d70622caea7f1841b12756376026f0efafb00a2edaeb814f`.
- Published release-manifest SHA-256 `1f57df974b68aef7906900bd5667a04fa75246e7adcf67b15ce2fd83b85220e6`, source `9d04950fb314846e701890ac3095d28056820918`.

The final website package was generated on this Mac using the committed importer from `d0d8833`, downloading the actual permanent producer archive and published manifest with independently verified digests. Package contents were extracted and verified before publication. Empty directories are preserved by the tar assets; clean checkouts no longer need a tracked empty-directory inventory.

`www-folio` was made public at the user’s explicit request. Both release assets are available without login. An earlier cold-download check correctly failed while the website repository was private; authentication was considered and then removed after the visibility change. The successful public cold-cache run used `--cache .cache/documentation/public-cold-cache --output .cache/documentation/public-cold-output`; no tracked generated inputs or warm cache were needed. Source snapshots were deleted only after this passed.

## Validation scope

The command seam verifies original release binding and tamper rejection, immutable imports, retained-version and failed-transform preservation, public-asset preservation, pinned download/export, invalid lock rejection, offline cache reuse/miss, corrupted cache rejection, and preservation of preceding public output on failure. Producer-side CLI tests cover bound packaging, empty-directory retention, tampering, and refusing replacement. Existing producer documentation tests also pass.

The HTTP/browser seam covers the Astro homepage/blog, canonical metadata and draft exclusion, real DocC rendering/search/assets, Latest-to-numbered topic switching, direct numbered refresh, missing-topic fallback through a substituted HTTP registry response, and old Latest aliases including deep links. The changed canonical route is `/documentation/undokit/`; numbered 0.2.2 stays isolated beneath `/UndoKit/versions/0.2.2/`. Only the exploratory 0.2.0 root redirect remains.

At local implementation completion: Astro check has zero errors/warnings/hints; formatting passes; four website integration tests and four Chromium browser tests pass. Both workflow YAML files and producer workflow updates were parsed/reviewed. Deployment and hosted Linux clean-checkout results are recorded separately when available; a local pass is not hosted acceptance.

## Review

Standards review found no actionable issue in packaging, extraction, verification, output replacement, or permissions. Spec review found one missing `/UndoKit/latest/<topic>` compatibility redirect; it was fixed and the browser suite now verifies that deep alias. Final follow-up review covers the artifact-only source state and public unauthenticated download path.

## Operating contract

[API pipeline runbook](../documentation.md) documents producer and website packaging jobs, explicit Latest adoption, immutable asset identities, offline use, recovery, and reserved DocC root asset paths. Original archives and provenance are retained in permanent bundles, never exported into the website. Adding independently generated frameworks at the root needs a shared renderer/index strategy; no multi-framework merge is claimed. The first website bundle is proven locally and through an actual public cold download; the future manual Xcode packaging workflow itself has not been dispatched during this implementation.
