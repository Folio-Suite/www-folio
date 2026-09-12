# Issue tracker: GitHub

Issues and specifications live in GitHub Issues for `Folio-Suite/www-folio`. Run the `gh` CLI from this clone.

## Conventions

- Create: `gh issue create --title "..." --body-file <file>`.
- Read, including discussion: `gh issue view <number> --comments`.
- List: `gh issue list --state open --json number,title,body,labels,comments`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Apply or remove labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number>`.

Write multiline issue bodies and comments to a temporary file and pass `--body-file`.

When a skill says “publish to the issue tracker,” create a GitHub issue. When it says “fetch the relevant ticket,” read the issue and its comments.

## Pull requests as a triage surface

PRs as a request surface: no.

## Wayfinding operations

- Map: an issue labelled `wayfinder:map`, containing Notes, Decisions-so-far, and Fog.
- Child: link each ticket as a GitHub sub-issue. Where unavailable, use a task list in the map and `Part of #<map>` in each child.
- Type labels: `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- Blocking: use native GitHub issue dependencies. Where unavailable, record `Blocked by: #<number>` in the child.
- Frontier: select the first open, unassigned child in map order whose blockers are all closed.
- Claim: assign the ticket to the driving developer as implementation starts. Leave queued tickets unassigned.
- Resolve: record the answer, close the ticket, and add a summary and link to the map's Decisions-so-far.
