<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# UndoKit DocC publication

Research date: October 19, 2026. Primary sources accessed on that date. This is a research recommendation, not an implemented deployment or accepted ADR.

## Finding

The requested arrangement is feasible: keep API comments, DocC catalogs, compilation, and source validation in UndoKit; manage generated publication artifacts and website presentation in www-folio. DocC supports static hosting beneath a configured path. A release-version selector should be website-owned UI: the Swift Documentation Workgroup explicitly describes version navigation as something coordinated outside DocC, using URL prefixes and custom header/footer navigation. This is evidence for the approach, not a promise that every future DocC version lacks such a feature. [Hosting documentation](https://www.swift.org/documentation/docc/distributing-documentation-to-other-developers), [workgroup discussion](https://forums.swift.org/t/documentation-workgroup-meeting-22-september-2025/82283).

## Proposed URL contract

| URL | Meaning |
| --- | --- |
| `/UndoKit/` | Opens the latest approved documentation |
| `/UndoKit/documentation/undokit/…` | Latest documentation topics |
| `/UndoKit/versions/1.2.3/` | Opens the retained 1.2.3 documentation |
| `/UndoKit/versions/1.2.3/documentation/undokit/…` | Permanent release topic URLs |

“Latest” should mean the explicitly promoted release, not whichever semantic version sorts highest or whatever happens to be on main. Preview documentation should be a distinct channel if introduced later. These are proposed publication policies.

DocC's hosting base path **adds a prefix**; it does not remove the generated `/documentation/<module>` portion of topic URLs. Configure a latest derivative for `/UndoKit` and release derivatives for `/UndoKit/versions/<version>`. Make each root entry open its module documentation. A root entry may redirect internally to `/UndoKit/documentation/undokit/`; redirecting the entire latest namespace to a numbered release would change the promised latest URL semantics. [DocC base-path behavior](https://www.swift.org/documentation/docc/distributing-documentation-to-other-developers).

The existing release export cannot simply be copied under `/UndoKit/`: its HTML/router/assets were configured for a different prefix. Derive the latest export from the retained original archive using the selected toolchain's supported archive transformation, then add website presentation. DocC provides `process-archive transform-for-static-hosting`; command spellings evolved, so check the installed toolchain's help rather than copying the historical pitch's option spelling verbatim. [Static-hosting design and archive command](https://forums.swift.org/t/support-hosting-docc-archives-in-static-hosting-environments/53572).

## Selector and integration

Use a small website-owned, labelled version selector with “Latest (1.2.3)” and retained numbered releases. Keep a publication manifest containing the latest release, version roots, and available topic routes. Switching versions should strip the current mount prefix, preserve the relative topic path when that target exists, and otherwise open the target module root with an explicit notice. Only preserve fragments known to exist in the target; renamed or removed APIs cannot be mapped reliably by string replacement. These are design recommendations, not DocC capabilities.

Prefer a custom header for Folio navigation and version controls while retaining DocC's footer and appearance controls. DocC maintainers describe top-level catalog `header.html` and `footer.html` enabled by `--experimental-enable-custom-templates`; they also warn that overriding the footer replaces its color-scheme controls. This remains an experimental integration point that must be verified against the pinned compiler. [Maintainer explanation](https://forums.swift.org/t/analytics-or-adding-custom-metadata-to-documentation-webpage/62895). Current compiler API documentation also models custom header and footer inputs. [DocumentationContext.Inputs](https://swiftlang.github.io/swift-docc/documentation/swiftdocc/documentationcontext/inputs/index.html).

The renderer is a client application: its layout source includes navigation, sidebar, content slots, and page-load fragment handling. A standalone injected selector must therefore derive its destination from the current location at activation time and remain correct after client-side topic navigation, back/forward, and direct page refresh. A React wrapper should not assume ownership of the DocC application DOM. [Renderer layout source](https://github.com/swiftlang/swift-docc-render/blob/main/src/components/DocumentationLayout.vue).

Avoid a renderer fork initially. Produce the rebased output first, then inject website-owned header/script/style assets consistently into all generated page shells. A reported Swift 6.3.2/compiler-main bug says archive rebasing can discard custom templates in regenerated page stubs. Treat this as a reported compatibility risk, not proof the current installed toolchain is affected; test both the root and directly refreshed deep pages. [Upstream issue #1532](https://github.com/swiftlang/swift-docc/issues/1532).

## Repository constraints and publication checks

The local `CONTEXT.md` assigns technical documentation to the Development site. `src/proxy.ts` currently rewrites editorial paths into destination routes, while `src/sites/paths.ts` does not reserve `UndoKit`. Implementation must reserve the namespace, bypass inappropriate editorial rewrites, and restrict documentation hosting to the Development destination. These observations describe the current local checkout, not upstream DocC.

[Tracked website issue #7](https://github.com/Folio-Suite/www-folio/issues/7) establishes manual publication, provenance, working assets/deep links/refresh, and preserving previous output on failure; multiple versions expand its earlier scope. The coordinating repository inspection also found that UndoKit's existing release stage requires a versioned base path and retains the original archive alongside the export. Preserve that producer artifact as input evidence.

Recommended manifest fields: source repository, source revision/tag, framework version, compiler/renderer identity, original archive digest, imported producer export digest, transformation revision/options, **final website artifact digest**, latest promotion identity, and retained route inventory. A website transformation changes bytes: do not reuse the producer's hash as the derivative's hash.

Before promotion, verify latest and numbered roots, direct deep-link refresh, CSS/JS/images/data/navigation/search, same-topic switching, missing-topic fallback, keyboard operation, mobile layout, and old-version isolation. Build and validate a complete candidate before changing the latest manifest so a failed import leaves the currently published site intact. Keep existing public URL redirects only after inventorying the actual deployed paths. No production behavior has been verified by this research.
