<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# UndoKit documentation publication

UndoKit owns API comments, its DocC catalog, compilation, and the release candidate archive. This repository owns imported originals, website derivatives, the latest promotion, and the version selector. Documentation is served only on the Development destination.

## Manual import

Obtain the documentation candidate directory and the published `UndoKit-<version>-manifest.json` release asset from the trusted UndoKit release. The candidate directory must contain `archive/`, `site/`, `producer.json`, and `manifest.json`, exactly as emitted by UndoKit's documentation staging command. Extract downloaded archives into a separate temporary directory before invoking the importer. The importer accepts an extracted local directory; it does not download or extract arbitrary archives.

On a Mac with the selected Xcode DocC toolchain available:

```sh
pnpm docs:import --artifact /absolute/path/to/candidate \
  --release-provenance /absolute/path/to/UndoKit-1.2.3-manifest.json
```

The supplied release manifest is the trust anchor: acquire it from the intended published release, rather than creating one from the candidate. The importer checks its complete documentation binding, original archive and export tree checksums, producer checksum, clean source revision, toolchain identity binding, and producer command identity. It does not establish release authenticity through a network lookup.

The command transforms the retained original archive twice using `xcrun docc process-archive transform-for-static-hosting`: once for `/UndoKit/` and once for `/UndoKit/versions/<version>/`. It adds website navigation assets after transformation. It validates search inventory, deep-refresh pages, and HTML resource paths before replacing publication output. A failed validation or transform preserves the previous publication. An exclusive lock prevents concurrent imports.

Review the generated diff under `documentation/undokit/` and run the repository checks before committing it. `--output /absolute/path` builds an isolated publication for evaluation. Every successful import explicitly promotes that version to Latest; numerical version sorting does not select the latest release. Existing version directories are immutable and duplicate imports fail. Documentation corrections require a separate future workflow rather than overwriting a retained version.

## Retained evidence

Each numbered version contains `original/` with the untouched candidate, `release-manifest.json` with the supplied release evidence, `site/` with the website derivative, and a website `manifest.json`. The website manifest records original provenance, release-manifest checksum, website Git revision, importer checksum, DocC identity, transformation arguments, mount, and final site tree checksum. The latest derivative has its own mount-specific manifest and checksum. `publication.json` records the explicitly promoted version and each numbered version's topic inventory.

The tree checksum format matches UndoKit: sorted relative paths, directory entries, and SHA-256 digests of file contents. Symlinks are rejected. The original producer export digest and transformed website digest describe different bytes and must remain separate.

Website customizations belong in the importer and `src/documentation/assets/` assets. Regenerate derivatives from original archives when changing generated HTML; hand edits invalidate recorded derivative checksums. Selector assets are shared website resources and receive normal Git review alongside the importer.

To regenerate website derivatives, import each retained `versions/<version>/original` candidate with its adjacent `release-manifest.json` into a fresh `--output` directory. Import the intended Latest version last. Validate the complete replacement, compare the original artifact hashes, and replace the tracked publication tree as part of a reviewed website commit. This preserves the immutable framework inputs while permitting website-owned HTML changes. The production file trace includes the generated sites and registry, and excludes retained originals and provenance manifests from the server bundle.

## Cutover

Keep UndoKit's existing hosted documentation available until the Development site's imported output has passed direct topic refresh, assets/search, version switching, keyboard, and mobile checks on its deployed hostname. Then update incoming documentation links and arrange redirects for the old public URLs. The initial implementation does not disable the old deployment or infer that local checks prove production cutover.
