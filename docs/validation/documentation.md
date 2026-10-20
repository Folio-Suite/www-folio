<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

> Historical validation of the retired Payload/Next.js implementation. Current validation is in [static-site.md](static-site.md).

# UndoKit website documentation validation

Validated October 19, 2026, using Node 24.19.0, the installed Xcode DocC compiler, and Playwright's matching Chromium 153 browser. Application tests used a disposable localhost PostgreSQL database; production services and credentials were not used.

## Imported releases

| Release | UndoKit source | Website entry |
| --- | --- | --- |
| 0.2.0 | `8d3ab774379413e9f330ce198aa27cb91eb4b74b` | `/UndoKit/versions/0.2.0/` |
| 0.2.2 | `9d04950fb314846e701890ac3095d28056820918` | `/UndoKit/versions/0.2.2/` |

Latest is explicitly promoted to 0.2.2 at `/UndoKit/`. These are also the two versions found in UndoKit's existing `documentation-snapshots` branch. The supplied release manifests were downloaded from their published GitHub releases. Original candidates came from retained release-preparation artifacts and passed complete manifest, producer, archive, and export identity checks. An earlier candidate that did not match the published release manifest was correctly rejected.

The website derivatives were generated with importer revision `a4c207c17694ba4425c8d2c46eb216e47335ced6`. All three final site tree hashes were rechecked against their website manifests. Numbered originals and published release provenance remain in the repository.

## Automated checks

- TypeScript checking and full repository ESLint pass.
- Full integration suite: 11 files, 29 tests pass. This includes command-level imports, retained versions, transform failure preservation, tamper rejection, and latest/archive HTTP behavior.
- Full browser suite: 14 of 15 tests pass, including both documentation tests. Documentation fixtures cover topic preservation, current SPA location, missing-topic notice, deep refresh, focus, and a 390-pixel viewport.
- The existing admin edit-view test fails waiting five seconds for `input[name="title"]`. The same assertion fails on an isolated copy of the unchanged starting commit `fa42dcd6483749a52b245b9fa20cd2c52837b4bb`, with the same Node/browser/database environment. A focused repeat on the implementation also reproduces it; this is not reported as a green full browser suite.
- Optimized production build passes. The final route trace includes latest output, both archived outputs, the publication registry, and selector assets, and includes zero retained-original files. Its 9,852 unique traced files total 57,662,417 bytes. Original archives and evidence manifests are excluded from the deployed function.

## Actual DocC acceptance

The optimized server was exercised locally with the real imported releases, independently of browser fixtures. Chromium loaded the latest module home and its JavaScript, CSS, images, theme data, and navigation index without failed requests or page errors.

Switching the actual `documentation/undokit/historysession/` topic to 0.2.0 preserved the topic. A direct refresh succeeded, and the navigator accepted a `HistorySession` filter with matching topic links. Switching the newer `historysession/setnativeactionnameresolver(_:)/` topic to 0.2.0 opened that version's module home with the unavailable-topic notice.

Screenshots at 1280 by 900 and 390 by 844 were inspected; the mobile page has no document-level horizontal overflow. HTTP Host checks returned 200 for the Development registry, 404 for Product, and 421 for an unknown host. The legacy `/UndoKit/latest` entry redirects to the stable latest namespace.

## Review and deployment boundary

Standards review: zero findings, including the later bundle exclusions. Spec review: zero findings, including the bundle exclusions. Both reviews compared implementation changes with `fa42dcd` and the approved research proposal.

No production deployment, DNS change, old workflow shutdown, or hosted acceptance is claimed. Complete the cutover procedure in [documentation publication](../documentation.md) after the website deployment is approved and verified on `foliosuite.dev`.
