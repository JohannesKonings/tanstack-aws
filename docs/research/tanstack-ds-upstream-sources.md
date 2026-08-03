# Research: TanStack DS upstream sources for sync

**Issue:** [#60](https://github.com/JohannesKonings/tanstack-aws/issues/60)  
**Question:** Where does TanStack DS live as primary source (repo/paths) for tokens (`app.css` / CSS variables), fonts, logo system, library marks, and copy-paste components? What exact inputs should a sync script pull into a vendored overwrite tree in this repo?  
**Researched:** 2026-08-03  
**Upstream pin inspected:** [`TanStack/tanstack.com@bf00919`](https://github.com/TanStack/tanstack.com/commit/bf00919b11adcedd71c0ce39ad8582ce31ddcf11) (`main`)

## Verdict

There is **no** dedicated `@tanstack/ds` npm package and **no** separate Design System repo in the TanStack org. TanStack DS is a **Phase 1 copy-paste registry** living inside the marketing/docs site:

| Layer | Primary home |
| --- | --- |
| Catalog (docs) | [https://tanstack.com/ds](https://tanstack.com/ds) |
| Source repo | [https://github.com/TanStack/tanstack.com](https://github.com/TanStack/tanstack.com) (default branch `main`) |
| Tokens | `src/styles/app.css` |
| Fonts | `public/fonts/*` (Inter self-hosted) + Google Fonts load in `src/routes/__root.tsx` (Bricolage Grotesque, IBM Plex Mono) |
| Logo system | `public/images/brand/**`, favicons under `public/`, gallery wiring in `src/components/ds/BrandAssets.tsx`, emblem React in `src/components/Logo.tsx` |
| Library marks | Phosphor icon map `src/libraries/icons.ts` + category/lib color tokens in `app.css` (+ text wordmark `src/components/LibraryWordmark.tsx`) — not separate SVG product logos |
| Copy-paste components | `src/components/ds/ui/**` (new-system DS primitives); a few demos still import production helpers outside that folder |
| Icons (general) | npm `@phosphor-icons/react` — **do not vendor**; consume from registry |

A sync script should pin a `TanStack/tanstack.com` git ref and overwrite a fixed tree with the paths listed under [Recommended sync inputs](#recommended-sync-inputs).

---

## Sources consulted (primary only)

1. Live catalog: [https://tanstack.com/ds](https://tanstack.com/ds) — Overview states Phase 1 is copy-paste and “Tokens live in `app.css`”.
2. Typography page: [https://tanstack.com/ds/typography](https://tanstack.com/ds/typography) — Bricolage Grotesque / Inter / IBM Plex Mono.
3. Iconography page: [https://tanstack.com/ds/iconography](https://tanstack.com/ds/iconography) — Phosphor via `@phosphor-icons/react`.
4. GitHub org listing (`gh api orgs/TanStack/repos`) — no `ds` / design-system repo; DS code is in `tanstack.com`.
5. First-party files under `TanStack/tanstack.com` (raw `main`), cited per claim below.

---

## Catalog model

From [tanstack.com/ds](https://tanstack.com/ds):

> Phase 1 is a copy-paste registry. Browse a component, open its code, and copy it into your site. Tokens live in `app.css` and are shared across every TanStack surface.

Sidebar sections are defined in [`src/components/ds/ds-nav.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/components/ds/ds-nav.ts):

- **Brand & Styles** — Logos, Colors, Typography, Iconography, Shadows, Effects
- **Figma Tokens** — Palette, Semantic Tokens (design-tool mirrors; CSS in `app.css` is the code source of truth)
- **Components** — Buttons, Badges, Eyebrow, Inputs, Dropdown, Avatar, Maintainers, Spinner, Collapsible, Breadcrumbs, Cards & Surfaces, Stats Section, Navbar

Route files live at `src/routes/ds*.tsx` (e.g. `ds.buttons.tsx`, `ds.logos.tsx`). Those routes are **demos/docs**, not the assets to vendor wholesale.

---

## Tokens (`app.css` / CSS variables)

**Primary file:** [`src/styles/app.css`](https://github.com/TanStack/tanstack.com/blob/main/src/styles/app.css) (~2371 lines on `main` as inspected).

Imported site-wide from [`src/routes/__root.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/routes/__root.tsx) (`import '~/styles/app.css'`).

Relevant regions inside that file:

| Region | Role |
| --- | --- |
| `@theme { … }` | Site fonts (`--font-sans` → Inter), shadow scale, twine/gray bridges |
| `@theme static { … }` | **DS primitive ramps** (`--color-ds-*`), **category/lib brand colors** (`--color-category-*`, `--color-lib-*`), **semantic tokens** (`--color-text-*`, `--color-background-*`, borders, status, interaction overlays), **DS type tokens** (`--font-ds-display`, `--font-ds-mono`, `--text-ds-*`) |
| `html.dark { … }` | Dark-mode overrides for DS semantic tokens |
| `@font-face` | Self-hosted Inter (`/fonts/Inter-latin*.woff2`) |
| Later CSS | Legacy/production helpers (`.btn-*`, glass menus, libraries overlay, etc.) — useful for parity but mixed with non-DS site chrome |

Comments in `app.css` state DS tokens are “sourced from Figma (‘Tanstack.com’ file)” and are the “single source of truth for the `/ds` style book.” Code consumers should sync **CSS**, not Figma (aligned with wayfinder map out-of-scope for Figma Tokens pages).

**Sync note:** Prefer vendoring the **whole** `app.css` as upstream input, then locally extracting/adapting the DS `@theme static` + `html.dark` + `@font-face` + needed utilities — rather than hand-picking token names. Shop-scoped tokens (`@theme inline` / `.shop-scope`) are merch-specific and can be dropped in the consumer adaptation step.

---

## Fonts

Type roles (from [ds/typography](https://tanstack.com/ds/typography) and `app.css`):

| Role | Family | Token |
| --- | --- | --- |
| Display / headings | Bricolage Grotesque | `--font-ds-display` |
| Body / labels | Inter | `--font-sans` |
| Mono / code | IBM Plex Mono | `--font-ds-mono` |

**How upstream loads them today:**

1. **Inter (self-hosted):** `@font-face` in `app.css` → [`public/fonts/Inter-latin.woff2`](https://github.com/TanStack/tanstack.com/blob/main/public/fonts/Inter-latin.woff2), [`public/fonts/Inter-latin-ext.woff2`](https://github.com/TanStack/tanstack.com/blob/main/public/fonts/Inter-latin-ext.woff2); preloaded in `__root.tsx`.
2. **Bricolage + IBM Plex Mono (CDN):** Google Fonts stylesheet link in [`src/routes/__root.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/routes/__root.tsx).
3. **Extra files in `public/fonts/`:** `BricolageGrotesque-Bold.ttf`, Inter TTF weights, `OFL-Bricolage-Grotesque.txt` — used at least by [`scripts/generate-brand-assets.mjs`](https://github.com/TanStack/tanstack.com/blob/main/scripts/generate-brand-assets.mjs) for raster brand generation, not the full variable web face.

**For this repo’s “self-host fonts via sync” preference:** sync should copy Inter woff2s from `public/fonts/`, plus obtain self-hosted builds of Bricolage Grotesque and IBM Plex Mono (weights matching the Google Fonts URL in `__root.tsx`: Bricolage opsz 12–96 / wght 300–800; IBM Plex Mono 300–700). The Bold TTF alone is insufficient for the full type system.

---

## Logo system

**Asset tree (canonical downloads shown on `/ds/logos`):**

- [`public/images/brand/`](https://github.com/TanStack/tanstack.com/tree/main/public/images/brand) — stacked / landscape / emblem lockups (SVG + some PNG)
- [`public/images/brand/social/`](https://github.com/TanStack/tanstack.com/tree/main/public/images/brand/social) — social mark/stacked light+dark SVG and `@2x` PNG
- Favicons: `public/favicon-light.svg`, `public/favicon-dark.svg` (and related `favicon*.png` / `.ico`)

**Wiring / rules:** [`src/components/ds/BrandAssets.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/components/ds/BrandAssets.tsx) (gallery used by [`src/routes/ds.logos.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/routes/ds.logos.tsx)).

**Inline emblem (navbar mark):** [`src/components/Logo.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/components/Logo.tsx) — SVG embedded in React (not only a static file).

**Legacy / alternate:** `public/images/logos/*` appears older marketing splash assets; prefer `public/images/brand/**` for current DS brand lockups.

**Out of sync scope for runtime UI:** `media/brand.sketch`, blog header SVGs under `public/blog-assets/`.

---

## Library marks

Library “marks” on tanstack.com are **not** a folder of per-library SVG logos. They are:

1. **Icon map** — [`src/libraries/icons.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/icons.ts): maps library id → Phosphor icon component. Documented as shared by Navbar mega-menu and `LibraryGridCard`.
2. **Color** — category/lib CSS tokens in `app.css` (`--color-category-*`, `--color-lib-*`) and class maps in [`src/libraries/categories.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/categories.ts).
3. **Wordmark text** — [`src/components/LibraryWordmark.tsx`](https://github.com/TanStack/tanstack.com/blob/main/src/components/LibraryWordmark.tsx) (“TanStack” + product name), not an image.

Icons themselves come from **`@phosphor-icons/react`** (package.json dependency; Iconography page). Sync should vendor the **mapping source** (`icons.ts`, optionally `categories.ts` / slim library metadata), not the Phosphor package.

---

## Copy-paste components

### New-system DS UI (primary component vendor root)

[`src/components/ds/ui/`](https://github.com/TanStack/tanstack.com/tree/main/src/components/ds/ui):

| Path | Exports / role |
| --- | --- |
| `index.tsx` | `Button`, `Badge`, `Eyebrow`, `FormInput`, `Card`, `InlineCode`, `Spinner`, `Avatar`, `Dropdown*`, `Breadcrumbs`, plus re-exports |
| `BlogPostCard.tsx` | Cards demo |
| `PalmSpinner.tsx` / `PixelSpinner.tsx` / `pixel-spinner-frames.ts` | Spinner variants |
| `StatsSection.tsx` | Stats section |

Header comment in `index.tsx`: these are the new Figma-token-based components used by `/ds` and staging; they **mirror** production APIs under `~/ui` / `~/components` but do not replace live site chrome until promoted.

### Supporting files still referenced by `/ds` demos

| Path | Used by |
| --- | --- |
| `src/components/ButtonGroup.tsx` | Buttons |
| `src/components/Collapsible.tsx` | Collapsible |
| `src/components/MaintainerCard.tsx` | Maintainers |
| `src/components/MegaMenuItem.tsx` (+ Navbar-related icons) | Navbar demo |
| `src/components/ds/pixel-spinner-frames.ts` | Pixel spinner |

### Catalog chrome (do **not** vendor as product UI)

`src/components/ds/DsKit.tsx`, `ds-nav.ts`, `BrandAssets.tsx`, `phosphor-icons.generated.ts` — style-book scaffolding.

### Older production UI (reference only)

[`src/ui/`](https://github.com/TanStack/tanstack.com/tree/main/src/ui) (`Button.tsx`, `Badge.tsx`, …) and many `src/components/*` production pieces — APIs mirrored by `ds/ui`, but **DS-looking sync should prefer `src/components/ds/ui/**`**.

### External runtime deps of DS components (npm, not vendored)

Observed imports from `ds/ui`: `@phosphor-icons/react`, `@radix-ui/react-dropdown-menu`, `tailwind-merge`, `@tanstack/react-router` (`Link` polymorphic Button). Consumer app already has Router; add Phosphor + Radix dropdown as needed when copying components.

---

## Recommended sync inputs

Pin: `TanStack/tanstack.com` @ chosen `main` SHA (or tag). Overwrite a fixed tree (e.g. `src/webapp/ds/` — exact dest contract is [#63](https://github.com/JohannesKonings/tanstack-aws/issues/63)).

### Always pull (overwrite)

| Upstream path | Purpose |
| --- | --- |
| `src/styles/app.css` | Tokens, type scale, shadows, dark semantic overrides, Inter `@font-face` |
| `public/fonts/Inter-latin.woff2` | Body font |
| `public/fonts/Inter-latin-ext.woff2` | Body font (ext) |
| `public/fonts/OFL-Bricolage-Grotesque.txt` | License companion when shipping Bricolage |
| `public/images/brand/**` | Logo lockups + social |
| `public/favicon-light.svg` | Favicon |
| `public/favicon-dark.svg` | Favicon |
| `src/components/Logo.tsx` | Inline emblem |
| `src/components/ds/ui/**` | Copy-paste DS components |
| `src/libraries/icons.ts` | Library mark icon map |
| `src/libraries/categories.ts` | Category → color class map |

### Pull when matching demos need them

| Upstream path | Purpose |
| --- | --- |
| `src/components/ButtonGroup.tsx` | Button groups |
| `src/components/Collapsible.tsx` | Collapsible |
| `src/components/LibraryWordmark.tsx` | Text library wordmark |
| `src/components/MaintainerCard.tsx` | Maintainers card (if used) |
| `src/components/MegaMenuItem.tsx` / Navbar pieces | Only if targeting DS Navbar parity |

### Pull / generate for self-hosted fonts (not fully in-repo today)

| Input | Notes |
| --- | --- |
| Bricolage Grotesque web fonts | Upstream uses Google Fonts; sync should download matching weights into vendored `fonts/` |
| IBM Plex Mono web fonts | Same |
| Optional: `public/fonts/BricolageGrotesque-Bold.ttf` | Useful for offline/asset tooling; incomplete for UI |

### Do **not** vendor via sync

| Item | Reason |
| --- | --- |
| `@phosphor-icons/react` | Official icon library — npm dependency |
| Figma / Palette & Semantic Tokens pages | Design mirrors; CSS is code SSOT; map marks Figma Tokens out of scope |
| `src/routes/ds*.tsx`, `DsKit.tsx`, `ds-nav.ts` | Catalog only |
| `src/styles/shop.css`, shop token blocks | Merch store |
| `media/*.sketch`, blog assets | Authoring / marketing |
| Entire `src/ui/` production set | Prefer `ds/ui`; avoid dual Button trees unless theme research requires it |

### Suggested local overwrite layout (illustrative)

```text
src/webapp/ds/
  styles/app.css          ← from src/styles/app.css (adapt/import)
  fonts/                  ← Inter woff2s + self-hosted Bricolage / IBM Plex Mono
  brand/                  ← public/images/brand/**
  favicon-light.svg
  favicon-dark.svg
  components/ui/          ← src/components/ds/ui/**
  Logo.tsx
  libraries/icons.ts
  libraries/categories.ts
```

Exact destination paths and overwrite rules belong to the sync-script grilling ticket (#63), not this research.

---

## Gaps / caveats

1. **No versioned DS release** — sync must pin git SHAs; breaking changes land on `tanstack.com` `main` without a package semver.
2. **`app.css` is a monolith** — mixing DS tokens, shop tokens, docs chrome, and legacy utilities; consumer adaptation is required.
3. **Fonts are partially CDN** — self-hosting Bricolage / IBM Plex Mono requires an extra fetch step beyond cloning static files.
4. **`ds/ui` vs production `src/ui` / `src/components`** — catalog demos mostly import `ds/ui`, but Collapsible/Maintainers/Navbar still pull production modules.
5. **Library marks ≠ SVG logos** — for nav “icon + name” patterns, sync `icons.ts` + tokens; install Phosphor.

---

## Answer gist

TanStack DS’s primary source is the **`TanStack/tanstack.com`** repo (catalog at **tanstack.com/ds**): tokens in **`src/styles/app.css`**, Inter in **`public/fonts/`**, Bricolage/IBM Plex Mono via **`__root.tsx` Google Fonts** (self-host separately), logos in **`public/images/brand/**`**, library marks as **`src/libraries/icons.ts` + category/lib CSS tokens** (Phosphor on npm), and copy-paste components in **`src/components/ds/ui/**`**. A sync script should pin that repo’s `main` SHA and overwrite a fixed vendored tree with those paths—not an npm `@tanstack/ds` package (none exists).
