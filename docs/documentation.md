<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# API documentation pipeline

UndoKit owns API comments, its DocC catalog, compilation, and the original release archive. This repository owns website transformation, explicit Latest selection, navigation, and publication. Only 0.2.2 is included in the first serious website rollout; earlier experimental snapshots remain recoverable in Git history.

## Canonical artifacts and working directories

The canonical inputs are permanent GitHub release assets, not a tracked generated tree:

1. `Folio-Suite/UndoKit`, release `0.2.2`: `UndoKit-0.2.2-documentation.tar.gz` contains exactly `archive/`, `site/`, `producer.json`, and `manifest.json`. These are the original clean release candidate, bound to the published `UndoKit-0.2.2-manifest.json` and its full source revision.
2. `Folio-Suite/www-folio`, release `undokit-docs-0.2.2-site-v1`: `UndoKit-0.2.2-website.tar.gz` retains that original candidate, the release manifest, and independently transformed Latest and numbered static exports with website provenance. The attached `lock-entry.json` describes the reviewed input/output identities. Website artifact releases do not replace framework release tags or the website’s Latest selection.
3. `src/data/documentation.json` is the small tracked lockfile: exact asset URLs, SHA-256 digests, release-manifest digest, full source revision, versions, and explicit Latest. Never use a floating “latest release” download or an expiring Actions artifact as a website-build dependency.

`.cache/documentation/` is ignored disposable build/package storage. Cached tarballs are content-addressed and checked on every use; extracted bundles are temporary and removed after export. `public/` contains ordinary authored assets plus ignored generated DocC resources. `dist/` is the deployable static website. The former tracked `documentation/undokit/` tree is retired; Git history preserves it.

## Release handoff

On UndoKit’s macOS/Xcode runner, stage documentation for the exact clean release source. After publishing the bound framework release manifest, run `Versioned documentation` with `operation=publish-asset`, the version, and the candidate Actions run ID. The producer verifies complete release binding and original hashes before attaching the permanent archive without clobbering another asset. Its packaging command is:

```sh
ruby scripts/documentation/release-asset.rb \
  --artifact /absolute/path/to/candidate \
  --release-provenance /absolute/path/to/UndoKit-0.2.2-manifest.json \
  --output /absolute/path/to/UndoKit-0.2.2-documentation.tar.gz
```

Then manually run this repository’s `Package documentation release` workflow with the version and independently reviewed SHA-256 values for the producer archive and published release manifest. Its Mac job downloads and verifies those pins, runs the website importer using Xcode DocC, packages the website bundle, and re-verifies the package. `publish=false` produces a reviewable Actions artifact; `publish=true` additionally publishes an immutable website-asset release through the `documentation-assets` environment. Configure an environment reviewer if desired. The ordinary Linux website build has no Xcode requirement. Both repositories and their documentation assets are public; website builds download pinned assets without a GitHub login or token.

The corresponding local command is:

```sh
node scripts/documentation/build-release.mjs --version 0.2.2 \
  --source-sha256 <reviewed-producer-archive-sha256> \
  --release-sha256 <reviewed-release-manifest-sha256> \
  --output .cache/documentation/release
```

For local candidates, `pnpm docs:package --artifact DIR --release-provenance FILE --output FILE` performs the same release binding and transformation without downloads. `pnpm docs:import` is the lower-level transform command; its default working output is ignored `.cache/documentation/imported`. Neither command modifies original release evidence. Existing numbered imports and package outputs cannot be overwritten.

Adopt the new release’s lock entry in a reviewed source change and select Latest explicitly. Publishing a bundle alone does not change the live website. A corrected website derivative needs a new immutable asset identity/tag and reviewed lock update; never replace bytes behind an existing digest.

## Website build

`pnpm dev` and `pnpm build` fetch the locked website bundles through `scripts/prepare-public.mjs`. The builder verifies the downloaded tarball digest before extraction, rejects unsafe archive paths, links, and special entries, and checks release-manifest binding, clean source/producer identity, original archive/export hashes, transformed website hashes, mounts, and topic inventories. It stages the complete public tree before swapping it into place; failures preserve the preceding export. A lock prevents simultaneous exporters. Inspect `public.lock` or `public.previous/` after a killed process before removing them.

A warm build can run without network:

```sh
node scripts/prepare-public.mjs --offline
```

An offline cache miss, changed digest, tampered original/derivative, or invalid Latest selection fails the build. A custom `--cache DIR`, `--output DIR`, or `--lockfile FILE` is available for validation. Keep cache and output paths separate.

Latest is `/documentation/undokit/`. DocC’s standard topic URLs continue beneath that path. Numbered exports remain isolated at `/UndoKit/versions/<version>/documentation/undokit/`; the version selector preserves a topic where available and explains fallback to the chosen version’s home otherwise. `/UndoKit/`, `/UndoKit/latest/`, and old Latest topic URLs redirect to the shorter canonical route. The exploratory 0.2.0 root redirects to Latest; its former topic archive is not retained in this rollout.

Root-hosted DocC also owns `public/{css,data,downloads,images,img,index,js,videos}/` and its renderer metadata/image files. Astro owns the homepage, its `_astro` assets, the `/documentation/` landing page, and ordinary public files such as CNAME, favicon.svg, and the license. Do not author resources in the reserved DocC paths. Adding another independently generated framework at the root requires a shared renderer/index strategy; the builder deliberately refuses unknown root exports rather than silently overwriting authored pages. Shared navigation belongs in `src/documentation/assets/` and is published under `/_documentation/undokit/`. Original release evidence stays in the package/cache and is never exported publicly.

The producer’s separate Pages deployment is retired. Publishing this site still requires the explicit main-branch Pages workflow dispatch; see [site operation](sites.md#github-pages).
