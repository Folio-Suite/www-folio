<!--
SPDX-FileCopyrightText: 2026 the Folio Project
SPDX-License-Identifier: MIT
-->

# Folio development publishing

**Development site**: the public developer home at foliosuite.dev, covering project resources, development notes, and API documentation.

**Page**: repository-authored content published at a stable website URL.

**Development note**: a Markdown blog entry with a title, description, publication date, and optional author. Drafts and future-dated notes are excluded from publication.

**Documentation snapshot**: generated API documentation tied to an identified framework release. Framework repositories own generating source; this repository owns retained output and website presentation.

**Latest documentation**: the snapshot explicitly promoted to the stable framework root, independent of numerical version sorting.

**Pages deployment**: the generated website artifact published by www-folio’s GitHub Actions workflow. Source and publishing configuration live in the same repository.
