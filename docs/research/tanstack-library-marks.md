# Research: Per-library icon and name assets for nav tooltips

**Issue:** [#63](https://github.com/JohannesKonings/tanstack-aws/issues/63)  
**Question:** Where are the official per-library marks used on tanstack.com (Start, Router, Query, DB, AI, Store, Form, Table, etc.) — icon + name assets suitable for drawer nav tooltips matching the libraries card pattern?

**Sources (primary):**

- Canonical icon map: [`TanStack/tanstack.com` `src/libraries/icons.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/icons.ts)
- Libraries cards: [`LibraryGridCard.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/components/LibraryGridCard.tsx)
- Navbar mega-menu: [`Navbar.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/components/Navbar.tsx) + [`MegaMenuItem.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/components/MegaMenuItem.tsx)
- Category colors: [`src/libraries/categories.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/categories.ts)
- Library metadata (names): [`src/libraries/libraries.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/libraries.ts)
- DS iconography: [tanstack.com/ds/iconography](https://tanstack.com/ds/iconography) (Phosphor)
- DS / brand logos (corporate only): [tanstack.com/ds/logos](https://tanstack.com/ds/logos), [`public/images/brand/`](https://github.com/TanStack/tanstack.com/tree/main/public/images/brand), [`BrandAssets.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/components/ds/BrandAssets.tsx)
- README banners (not tooltip assets): [docs/readme-headers.md](https://github.com/TanStack/tanstack.com/blob/main/docs/readme-headers.md)

---

## Verdict

There are **no per-library SVG/PNG logo files** behind the tanstack.com “All Libraries” cards or Libraries mega-menu.

The card / menu pattern is:

1. **Icon** — a **Phosphor** React component from `@phosphor-icons/react`, looked up by library id in `src/libraries/icons.ts`.
2. **Name** — **plain text** (`library.name` with the leading `TanStack ` stripped), not an image wordmark.
3. **Color** — **category tokens** (framework / data / ui / …), not a unique per-library palette on the cards.

For drawer nav tooltips that should match that pattern: depend on `@phosphor-icons/react`, copy (or sync) the id→icon map, and render the short product name as text. Do **not** vendor per-library image marks for this use case.

Corporate palm-island assets under `/images/brand/` are the **TanStack brand** lockups only — useful for app chrome, not for “Query” / “Start” library marks.

---

## Libraries card / mega-menu pattern

### Icon source of truth

[`src/libraries/icons.ts`](https://raw.githubusercontent.com/TanStack/tanstack.com/main/src/libraries/icons.ts) is documented in-repo as the **canonical** map shared by:

- Navbar Libraries mega-menu (`Navbar.tsx`)
- Full-screen / page library cards (`LibraryGridCard.tsx`)

Icons are chosen to match the Figma “Mega Menu” design. Package: `@phosphor-icons/react` `^2.1.10` on tanstack.com. DS docs describe Phosphor as the systematic icon set ([/ds/iconography](https://tanstack.com/ds/iconography)).

### Name rendering

Both card and mega-menu strip the org prefix:

```ts
library.name.replace(/^TanStack\s+/, '')
```

Examples: `TanStack Query` → `Query`, `TanStack Start` → `Start`. Typography on cards uses the DS display font (`font-ds-display`); mega-menu titles use `text-ds-heading-5` / Bricolage via DS tokens.

There is also [`LibraryWordmark`](https://github.com/TanStack/tanstack.com/blob/main/src/components/LibraryWordmark.tsx) for **text** “TanStack / Product” lockups with category gradient classes — still not image assets.

### Color on cards

[`LibraryGridCard`](https://github.com/TanStack/tanstack.com/blob/main/src/components/LibraryGridCard.tsx) tints the Phosphor icon by **category** (e.g. framework → green ramp, data → terracotta). Category membership and style fields live in [`categories.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/categories.ts). Mega-menu rows often keep icons in neutral `text-text-secondary` with category color on the column label.

---

## Per-library map (showcase-relevant + full canonical)

Format: **React component** from `@phosphor-icons/react` (not a file URL). Weight on mega-menu items is typically `light` via Phosphor `IconContext`.

| Library id | Display name (tooltip) | Phosphor icon export | Category (card tint) |
| ---------- | ---------------------- | -------------------- | -------------------- |
| `start` | Start | `SunHorizonIcon` | framework |
| `router` | Router | `TrafficSignIcon` | framework |
| `query` | Query | `SealQuestionIcon` | data |
| `db` | DB | `DatabaseIcon` | data |
| `store` | Store | `DresserIcon` | data |
| `ai` | AI | `BrainIcon` | data |
| `form` | Form | `ClipboardTextIcon` | ui |
| `table` | Table | `TableIcon` | ui |
| `charts` | Charts | `ChartLineUpIcon` | ui |
| `hotkeys` | Hotkeys | `SmileyMeltingIcon` | ui |
| `markdown` | Markdown | `MarkdownLogoIcon` | ui |
| `highlight` | Highlight | `HighlighterIcon` | ui |
| `virtual` | Virtual | `GogglesIcon` | performance |
| `pacer` | Pacer | `TimerIcon` | performance |
| `devtools` | Devtools | `PencilRulerIcon` | tooling |
| `config` | Config | `GearSixIcon` | tooling |
| `cli` | CLI | `TerminalWindowIcon` | tooling |
| `intent` | Intent | `CrosshairIcon` | tooling |
| `ranger` | Ranger | `SlidersIcon` | tooling |
| _(fallback)_ | — | `TargetIcon` | tooling default |

Full names and ids also appear in [`libraries.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/libraries.ts) / [`ids.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/ids.ts). Libraries without a map entry use `fallbackLibraryIcon` (`TargetIcon`).

---

## What lives where (asset inventory)

### A. Per-library “marks” for UI (tooltip / card pattern)

| What | Path / package | Format | Notes |
| ---- | -------------- | ------ | ----- |
| Icon map | `TanStack/tanstack.com` → `src/libraries/icons.ts` | TypeScript (`Record<string, Icon>`) | **Sync this file (or a slim copy)** as the mapping source of truth |
| Icon glyphs | npm `@phosphor-icons/react` | React SVG components | Official DS iconography; not vendored as loose SVGs on the site for libraries |
| Names | `src/libraries/libraries.ts` → `name` | String | Strip `TanStack ` for card/tooltip label |
| Category tint | `src/libraries/categories.ts` + DS CSS tokens | Tailwind / CSS vars | Optional for tooltips; cards use category ramps |

**Raw map URL (for sync scripts):**  
`https://raw.githubusercontent.com/TanStack/tanstack.com/main/src/libraries/icons.ts`

### B. Corporate brand logos (not per-library)

Served from tanstack.com and checked into `TanStack/tanstack.com`:

| Lockup | Example path | Formats |
| ------ | ------------ | ------- |
| Stacked / landscape / emblem | `/images/brand/tanstack-{stacked\|landscape\|emblem}-{black\|charcoal\|cream\|white}.svg` | SVG (+ some PNGs) |
| Social | `/images/brand/social/mark-{dark\|light}.svg` (+ `@2x.png`) | SVG, PNG |
| Favicons | `/favicon-light.svg`, `/favicon-dark.svg`, … | SVG / PNG / ICO |
| Legacy | `/images/logos/logo-*.svg`, `logo-color-*.png`, … | SVG, PNG |

Documented at [/ds/logos](https://tanstack.com/ds/logos) and [/brand-guide](https://tanstack.com/brand-guide). Gallery wiring: `src/components/ds/BrandAssets.tsx`. Generation: `scripts/generate-brand-assets.mjs`.

These are appropriate for **app brand chrome**, not for “Start / Query / …” tooltip icons.

### C. Related but wrong for nav tooltips

| Asset | Location | Why not for tooltips |
| ----- | -------- | -------------------- |
| Dynamic README banner | `GET https://tanstack.com/api/readme/<libraryId>.png` (`?theme=dark`, `?framework=`) | 1800×450 marketing banner; see `docs/readme-headers.md` |
| Repo `media/` folders | e.g. `TanStack/query/media/` (`partner_logo.svg`, `emblem-light.svg`, headers) | Legacy / partner / README; not the libraries-card pattern |
| `LibraryWordmark` | React text component | Text gradients only; no downloadable name SVG |

---

## How to vendor via sync

Aligned with map #59 (consume DS via sync; icons via `@phosphor-icons/react`; no `@tanstack/ds` package):

1. **Install** `@phosphor-icons/react` (match tanstack.com major: `^2.1.10` or current compatible).
2. **Sync or copy** `src/libraries/icons.ts` from `TanStack/tanstack.com` into a fixed tree (e.g. `src/vendor/tanstack/libraries/icons.ts`), or generate an equivalent id→component map from that file. Overwrite on each sync run.
3. **Names:** hardcode or sync a slim id→displayName table derived from `libraries.ts` (or strip `TanStack ` at render time). No image download.
4. **Optional:** sync category map from `categories.ts` if tooltips should use category icon tint like `LibraryGridCard`.
5. **Do not** scrape `/images/brand/` or README PNG endpoints for per-library tooltip marks.
6. **Brand logos** (palm island) remain a separate sync path under `public/images/brand/` when implementing DS brand chrome — orthogonal to this ticket.

Suggested tooltip composition (parity with cards):

```tsx
const Icon = libraryIcons[id] ?? fallbackLibraryIcon
const name = fullName.replace(/^TanStack\s+/, '')
// <Icon className="size-5 …" weight="light" /> + {name}
```

---

## Implications for this app

- Nav tooltips should use **Phosphor + short name text**, matching tanstack.com libraries cards / mega-menu — not custom library logo images.
- Removing `lucide-react` in favor of Phosphor (map #59) is the same icon system these marks already use.
- Exact category color token remapping onto shadcn vars is covered by other research tickets; tooltips can ship with neutral icon color first if needed.

---

## Gaps / non-goals

- No official downloadable “Query logo.svg” set for the current card UI.
- Phosphor weights: mega-menu uses `light`; cards don’t force weight in `LibraryGridCard` — pick one and stay consistent in tooltips.
- Figma Mega Menu is referenced in source comments; this note uses the shipped GitHub sources as authoritative for code.
