<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# UndoKit documentation publication

UndoKit owns API comments, its DocC catalog, compilation, and release candidate archives. This repository owns imported originals, website derivatives, Latest promotion, and the version selector. The static Development website includes these derivatives without a runtime server.

## Manual import

Obtain the original clean documentation candidate and the published `UndoKit-<version>-manifest.json` from the trusted UndoKit release. The extracted candidate contains `archive/`, `site/`, `producer.json`, and `manifest.json` exactly as emitted by UndoKit staging. On a Mac with Xcode's DocC toolchain:

```sh
pnpm docs:import --artifact /absolute/path/to/candidate \
  --release-provenance /absolute/path/to/UndoKit-1.2.3-manifest.json
```

The supplied published manifest is the trust anchor: do not synthesize it from the candidate. The importer verifies the complete release binding, original archive/export/producer checksums, clean source revision, toolchain binding, and producer command. It does not establish release authenticity through a network lookup.

Each successful import explicitly promotes that version to Latest. Existing numbered originals are immutable; duplicate imports fail. Corrections to framework-authored release guidance require a separate reviewed correction workflow rather than replacing retained inputs.

## Retained and deployed files

`documentation/undokit/versions/<version>/` retains `original/`, `release-manifest.json`, a website `manifest.json`, and the rebased `site/`. Latest has its own site and manifest. The importer transforms the original archive separately for `/UndoKit/` and `/UndoKit/versions/<version>/`, then injects navigation links. Website manifests record producer provenance, importer identity, DocC identity, transformation arguments, mount, and final site tree checksum. `publication.json` records Latest and topic inventories.

`pnpm build` verifies these website identities and copies the deployable trees into the final static output:

- `dist/UndoKit/` presents Latest.
- `dist/UndoKit/versions/<version>/` contains numbered snapshots.
- `dist/UndoKit/publication.json` supplies the version selector.
- `dist/UndoKit/_folio/` contains shared website navigation assets.
- `dist/UndoKit/latest/` keeps the legacy Latest entry working.

The original archives and provenance files remain in the source repository and are excluded from the public export. Exporting does not modify any retained release bytes or checksums. The static-host directory index opens each documentation page, and DocC supplies the browser-side renderer and search.

Website customizations belong in the importer and `src/documentation/assets/`. For changes to generated HTML, reimport each retained original with its adjacent release manifest into a fresh `--output` tree, importing the intended Latest version last. Validate and replace the tracked derivatives in a reviewed commit. Shared navigation assets are ordinary website source and are copied after documentation verification. Do not hand-edit generated snapshots and leave stale digests.

The export command validates all inputs before replacing `public/UndoKit/`. A failed validation preserves the preceding export. A lock prevents simultaneous exporters; a leftover `public/UndoKit.lock` after a killed process should be inspected and removed only when no exporter remains. Original importer candidates and website derivatives use different digests because they describe different bytes.

## Cutover

Follow [GitHub Pages operation](sites.md#github-pages). Keep the old deployment available until the combined artifact is ready, then coordinate retirement of UndoKit's separate project Pages site with the root hosting switch. Verify actual hosted latest/archive navigation, assets, search, and deep refresh. Never infer production acceptance from local export success.

## Agreed direction: release assets instead of tracked output

Generate documentation once on the UndoKit macOS/Xcode release runner, and publish permanent, versioned release assets. The website should fetch pinned assets during its Linux build, verify reviewed SHA-256 digests and release provenance, and assemble Latest plus archives into ignored `public/UndoKit/`. Source comments/catalogs continue to belong to UndoKit. Latest remains an explicit website selection rather than a floating network lookup.

A raw `.doccarchive` alone does not make the current pipeline Linux-ready: `scripts/documentation/import.rb` uses Xcode’s `xcrun docc` to rebase static exports for both `/UndoKit/` and `/UndoKit/versions/<version>/`. The release handoff therefore needs the original archive **and the required static exports**, prepared on macOS, or a separately validated Linux DocC transformation toolchain. Website navigation stays owned by this repository. The current exporter verifies retained copies; it does not yet download these proposed assets.

As checked on 2026-10-19, the public 0.2.2 release has the XCFramework, release manifest, qualification evidence, and checksum file, but no documentation archive/export bundle. The producer’s `Versioned documentation` workflow retains candidates for 90 days, which is unsuitable as a permanent build dependency. See the [release assets](https://github.com/Folio-Suite/UndoKit/releases/tag/0.2.2) and [producer workflow](https://github.com/Folio-Suite/UndoKit/blob/main/.github/workflows/documentation.yml).

Before deleting tracked snapshots: publish immutable bundles for every retained version; bind each bundle to its release and full source revision; commit a small lockfile with asset identities/digests and explicit Latest; test clean-cache downloads, corrupted/missing assets, offline cache reuse, and preservation of previous output on failure; then verify the full static build and version selector. Keep the original release archives and manifests recoverable. Existing snapshots remain deliberately retained until that replacement is operational. This hygiene pass records the accepted design without changing UndoKit’s release publication or weakening its provenance contract.
