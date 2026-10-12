---
name: docs-diagrams
description: Draw, sync, and review the HTML diagrams in docs/diagrams that GitHub Pages publishes from Mermaid blocks in docs/. Use when adding or editing a Mermaid block in docs/, when asked for a docs diagram, or when reviewing a diff that touches docs/.
---

Every Mermaid block in `docs/**/*.md` has exactly one **redraw** in `docs/diagrams/`, drawn with the `diagram-design` skill, unless a skip marker sits above the fence. The Markdown doc is the source of truth; the redraw is the published copy on GitHub Pages.

A redraw pins its block with two tags in `<head>`:

```html
<meta name="docs-diagram:source" content="docs/stage-database.md" />
<meta name="docs-diagram:mermaid" content="sha256:dc04525f22618850" />
```

The hash covers the fence body only. Editing the block makes its redraw **stale**; editing prose around it does not, which is why review reads the prose too.

| Task                          | Effect                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `vp run docs-diagrams:blocks` | Each block with its line, hash, and redraw (or `missing` / `skip`).             |
| `vp run docs-diagrams:check`  | Fails on `missing`, `stale`, `duplicate`, `invalid`, or an out-of-date `index`. |
| `vp run docs-diagrams:index`  | Regenerate `docs/diagrams/index.html` from the redraws. Never edit it by hand.  |

`vp test` runs the same check (`tooling/docs-diagrams/`), so CI fails on drift.

## Draw or redraw

1. Run `vp run docs-diagrams:blocks` and take the block's doc, line, and hash.
2. Read `.agents/skills/diagram-design/SKILL.md` and follow its Mermaid import path. Fixed choices for this repo:
   - Style gate: keep the default skin. The user chose this; skip onboarding.
   - Dials: format `html`, size `doc-wide`, detail `faithful`, audience `engineer`. Keep the doc's identifiers verbatim (`tanstackaws`, `migrateStageDatabaseSchema`), since readers search for them.
   - Pick the visual type from the doc's point, not from the Mermaid keyword: containment reads as Nested, alternative lifecycle branches as Sequence with ALT fragments, parallel paths as Swimlane or Data flow.
3. Write `docs/diagrams/<doc-basename>-<subject>.html` with both meta tags. A redraw of a changed block updates its existing file; bump the hash once the drawing matches the new block.
4. From `.agents/skills/diagram-design/`, run `python3 scripts/self_check.py <file>` until it prints `OK`.
5. Run `vp run docs-diagrams:index`, then `vp run docs-diagrams:check`. Done when the check prints `in sync`.

A block not worth a redraw gets `<!-- docs-diagram: skip <reason> -->` on the line above its fence, with a reason a reviewer can judge.

## Review

Run this for any diff that touches `docs/`, alongside `/code-review`. Report under `## Docs diagrams`.

1. Run `vp run docs-diagrams:check`. Every finding is a hard finding.
2. For each redraw whose source doc changed in the diff, read the changed prose against the redraw's labels. A renamed identifier, a new or removed component, or a changed rule the redraw still shows is **drift**: report it with the doc line and the redraw label.
3. For each skip marker added in the diff, judge whether the reason holds.

Done when every redraw of a changed doc has been read, not just checked.
