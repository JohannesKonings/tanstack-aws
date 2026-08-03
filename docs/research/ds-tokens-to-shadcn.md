# Research: Map DS tokens onto shadcn semantic CSS variables

**Issue:** [#61](https://github.com/JohannesKonings/tanstack-aws/issues/61)
**Question:** How do TanStack DS primitive/semantic CSS tokens map onto this app's shadcn semantic variables (`--background`, `--primary`, `--radius`, etc.) in light and dark? What gaps remain after remapping?

## Sources

| Source | Role |
| --- | --- |
| [TanStack/tanstack.com `src/styles/app.css`](https://github.com/TanStack/tanstack.com/blob/main/src/styles/app.css) (sha `375b7b8d…`) | Primary: DS primitive ramps (`@theme static`), semantic tokens, `html.dark` overrides |
| [tanstack.com/ds](https://tanstack.com/ds), [/ds/semantic](https://tanstack.com/ds/semantic), [/ds/colors](https://tanstack.com/ds/colors), [/ds/palette](https://tanstack.com/ds/palette) | Style-book docs confirming token names / roles |
| [tanstack.com DS Button](https://github.com/TanStack/tanstack.com/blob/main/src/components/ds/ui/index.tsx) | How semantics are consumed (focus ring, surfaces, secondary fill) |
| This app [`src/webapp/styles.css`](../../src/webapp/styles.css) | Current shadcn zinc light + `.dark` variables + `@theme inline` bridge |
| This app [`components.json`](../../components.json) (`baseColor: zinc`, `cssVariables: true`) | Confirms shadcn CSS-variable theme contract |
| This app [`src/webapp/components/ui/button.tsx`](../../src/webapp/components/ui/button.tsx), [`badge.tsx`](../../src/webapp/components/ui/badge.tsx) | Consumers of `--primary`, `--destructive`, `--ring`, radius utilities |

## Feasibility verdict

**Remapping is feasible for the core shadcn color contract** (background/foreground, card/popover, primary/secondary/muted/accent, destructive, border/input/ring, sidebar family) by pointing each shadcn var at a DS semantic (or a composed DS primitive) and keeping shadcn *names* as the component API.

Primitives stay mode-stable; **only semantic mappings flip in dark** (`html.dark` in DS vs `.dark` here). Implementation should vendor DS tokens, then redefine `:root` / `.dark` (or `html.dark`) shadcn vars as `var(--color-…)` aliases — not hard-copy hex unless a DS semantic is missing.

What remapping alone does **not** buy: radius token parity, chart palette, dedicated hover tokens (shadcn uses `/90` opacity), status/success/warning/info as first-class shadcn vars, DS fonts/shadows, or DS Button motion/gradient variants.

## Token model comparison

### TanStack DS (`app.css`)

- **Primitives** (`@theme static`): `--color-ds-{green,terracotta,blue,purple,amber,neutral}-{100…500}`, plus cool `--color-ds-neutral-tint-*`, `--color-ds-neutral-0`.
- **Semantics** (same block, light defaults): `--color-text-*`, `--color-background-*`, `--color-border-*`, `--color-icon-*`, `--color-action-*`, `--color-status-*`, `--color-accent-*`, surface-state overlays.
- **Dark:** `html.dark { … }` reassigns **semantics only**; comment in source: *"Primitives don't change between modes — only these semantic mappings do."*
- **Typography / effects:** `--font-ds-display`, `--font-ds-mono`, `--text-ds-*` scales, `--shadow-*` in `@theme` — not part of the shadcn color API.
- **Radius:** no `--radius` (or similar) design token. Components use Tailwind `rounded-md` / `rounded-lg` / `rounded-xl` / `rounded-full`.

### This app (shadcn zinc)

- `:root` + `.dark` set shadcn semantics as **oklch** literals (`--background`, `--primary`, …).
- `@theme inline` bridges to Tailwind v4 `--color-*` and derives `--radius-sm/md/lg/xl` from `--radius: 0.625rem`.
- Dark primary is **inverted zinc** (near-white fill / dark ink) — different from DS brand `action-primary` (blue/teal in both modes).

## Recommended mapping (keep shadcn names)

Convention: left = this app's CSS custom property; right = DS token to assign via `var(...)`. Hex shown for readability from `app.css` (light `@theme static` / `html.dark`).

### Surfaces & text

| shadcn var | Light → DS | Dark → DS | Notes |
| --- | --- | --- | --- |
| `--background` | `--color-background-default` `#ffffff` | `#111111` | Page canvas |
| `--foreground` | `--color-text-primary` → `ds-neutral-500` `#111111` | `#ffffff` | Body ink |
| `--card` | `--color-background-surface` `#ffffff` | `#1f1f1f` | In light, surface == default; **dark gains elevation** |
| `--card-foreground` | `--color-text-primary` | `--color-text-primary` | |
| `--popover` | `--color-background-elevated` `#ffffff` | `#2b2b2b` | Prefer elevated for menus/overlays |
| `--popover-foreground` | `--color-text-primary` | `--color-text-primary` | |

### Actions (primary / secondary / accent / muted)

| shadcn var | Light → DS | Dark → DS | Notes |
| --- | --- | --- | --- |
| `--primary` | `--color-action-primary` → `ds-blue-500` `#003e53` | `#3aa3c4` | Brand CTA. **Breaks zinc near-black/white primary** by design |
| `--primary-foreground` | `--color-action-primary-text` `#ffffff` | `#ffffff` | |
| `--secondary` | `--color-action-secondary` → `ds-neutral-100` `#eeebd4` | `#2b2b2b` | Warm cream in light |
| `--secondary-foreground` | `--color-text-primary` | `--color-text-primary` | DS secondary button uses `text-text-primary` |
| `--muted` | `--color-background-subtle` `#fafafa` | `#1b1b1b` | Quiet fill |
| `--muted-foreground` | `--color-text-muted` → `ds-neutral-300` `#756c5b` | `#756c5b` | Same ramp step both modes in current DS CSS |
| `--accent` | `--color-background-subtle` (or `action-secondary`) | `#1b1b1b` / `#2b2b2b` | shadcn accent ≈ hover/alt surface; DS has no single `--accent` twin |
| `--accent-foreground` | `--color-text-primary` | `--color-text-primary` | |

**Alternative for `--primary`:** DS “neutral” primary Button uses `background-inverse` / `text-inverse` (black↔white flip), closer to current zinc behavior. Prefer **`action-primary`** if the adoption goal is TanStack brand blue; prefer **inverse** if the goal is high-contrast monochrome chrome with brand color reserved for accents/links (`text-accent` / `accent-brand`).

### Destructive, chrome, focus

| shadcn var | Light → DS | Dark → DS | Notes |
| --- | --- | --- | --- |
| `--destructive` | `--color-action-destructive` / `status-error` → `ds-terracotta-400` `#d3481b` | `#e06e49` | |
| `--destructive-foreground` | **gap** — no DS twin | **gap** | Practical: `#ffffff` on filled destructive; or `text-error` for outline/text-only |
| `--border` | `--color-border-default` → `ds-neutral-200` `#aea691` | `#2d2d2d` | |
| `--input` | `--color-border-default` | `#2d2d2d` | No dedicated DS input-border; hover overlay is `--color-input-bg-hover` only |
| `--ring` | `--color-border-focus` → `ds-blue-400` `#3aa3c4` | `#61adbf` | Matches DS Button `ring-border-focus` |

### Radius

| shadcn var | DS equivalent | Recommendation |
| --- | --- | --- |
| `--radius` (`0.625rem` today) | **None** (utility classes only) | Keep a local `--radius`. Align to DS defaults: buttons default `rounded-lg` (≈ `0.5rem`) for md+; sm uses `rounded-md`. Derived `--radius-sm/md/lg/xl` stay in `@theme inline`. |

### Sidebar family

No DS `--sidebar-*` tokens. Compose from semantics:

| shadcn var | Suggested DS mapping (both modes via semantics) |
| --- | --- |
| `--sidebar` | `--color-background-surface` (or `subtle` if drawer should recess) |
| `--sidebar-foreground` | `--color-text-primary` |
| `--sidebar-primary` | `--color-action-primary` (or category/lib brand if nav is library-tinted) |
| `--sidebar-primary-foreground` | `--color-action-primary-text` |
| `--sidebar-accent` | `--color-background-subtle` / `action-secondary` |
| `--sidebar-accent-foreground` | `--color-text-primary` |
| `--sidebar-border` | `--color-border-default` |
| `--sidebar-ring` | `--color-border-focus` |

### Charts

| shadcn var | DS equivalent | Recommendation |
| --- | --- | --- |
| `--chart-1` … `--chart-5` | **No chart tokens** | Provisional: map to category accents / brand ramps (`category-framework`, `category-data`, `category-ui`, `category-performance`, `accent-creative` / `ds-purple-400`) — **app-local convention**, not upstream DS |

## Light vs dark behavior changes after remap

| Concern | Current zinc | After DS remap |
| --- | --- | --- |
| Primary button | Dark fill (light) / light fill (dark) | Brand blue/teal both modes (`action-primary`) unless inverse alternative chosen |
| Card vs page | Same color both modes | **Differ in dark** (`surface` / `elevated` vs `#111`) — positive for depth |
| Borders | Cool zinc gray | Warm `ds-neutral-*` in light; near-black grays in dark |
| Muted text | Cool zinc | Warm brown-gray `#756c5b` |
| Selector | `.dark` | DS uses `html.dark`; app can keep `.dark` if overrides live on that selector — just mirror the same assignments |

## Gaps remaining after remapping

1. **No DS `--radius` token** — must keep local radius scale; only approximate DS via Tailwind rounded steps.
2. **No `--destructive-foreground`** — invent local pairing.
3. **No `--chart-*`** — invent mapping from category/lib/accent ramps.
4. **No `--sidebar-*`** — compose only; no upstream sidebar semantics.
5. **Hover / pressed** — DS exposes `--color-action-primary-hover`, `--color-action-secondary-hover`, `--color-surface-state-*`; shadcn components mostly use opacity (`hover:bg-primary/90`). Remap alone leaves hover fidelity incomplete until variants use dedicated hover tokens or `color-mix`.
6. **Status / feedback beyond destructive** — DS `status-success|warning|info` (+ `-bg`) and `text-success|warning|error|info` have no shadcn twins; useful for forms/toasts but out of core remap.
7. **Icon semantics** (`icon-default|muted|accent|…`) — unused by shadcn color API; Phosphor adoption may want these separately.
8. **Brand accents** (`accent-brand|warm|highlight|nature|creative`) and **category/lib colors** — extra surface area beyond shadcn; keep as parallel DS utilities, not forced into `--primary`.
9. **Typography & shadow tokens** — fonts (`--font-ds-display` / mono) and `--shadow-*` are outside shadcn CSS vars; required for “reads as TanStack DS” but not solved by color remap.
10. **Color space / naming bridge** — DS tokens are hex under `--color-*` in `@theme static`; shadcn today is oklch under unprefixed names. Need one alias layer (`--background: var(--color-background-default)`) plus existing `@theme inline`.
11. **DS Button extras** — gradient CTA, lift shadows, `subtle-link`, default `rounded-lg` — not expressible by CSS var remap alone (tracked by Button research / #62).

## Suggested implementation shape (not in scope of this ticket)

```css
/* After vendoring DS tokens into the app */
:root {
  --background: var(--color-background-default);
  --foreground: var(--color-text-primary);
  --primary: var(--color-action-primary);
  --primary-foreground: var(--color-action-primary-text);
  --secondary: var(--color-action-secondary);
  --secondary-foreground: var(--color-text-primary);
  --muted: var(--color-background-subtle);
  --muted-foreground: var(--color-text-muted);
  --accent: var(--color-background-subtle);
  --accent-foreground: var(--color-text-primary);
  --destructive: var(--color-action-destructive);
  --destructive-foreground: #ffffff; /* local gap-fill */
  --border: var(--color-border-default);
  --input: var(--color-border-default);
  --ring: var(--color-border-focus);
  --card: var(--color-background-surface);
  --card-foreground: var(--color-text-primary);
  --popover: var(--color-background-elevated);
  --popover-foreground: var(--color-text-primary);
  --radius: 0.5rem; /* align to DS rounded-lg default; still local */
  /* sidebar-* / chart-* composed or provisional as above */
}

.dark {
  /* Same aliases — DS html.dark (or duplicated .dark block) already
     reassigns --color-background-*, --color-action-*, etc. */
}
```

Ensure dark mode flips DS semantics (port `html.dark { … }` assignments) **before** relying on the aliases.

## Answer gist

Core shadcn semantics map cleanly onto DS `background-*`, `text-*`, `action-*`, and `border-*` (plus composed sidebar). Remapping will shift the app from cool zinc + inverted primary to warm neutrals and brand blue CTAs, with real dark elevation (`surface`/`elevated`). Remaining gaps: radius, charts, destructive-foreground, hover-token usage, status/icon/accent extras, fonts/shadows, and anything that needs Button variant work beyond CSS variables.
