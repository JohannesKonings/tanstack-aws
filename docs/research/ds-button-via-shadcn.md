# Research: Match TanStack DS Button via shadcn theme/variants

**Issue:** [#62](https://github.com/JohannesKonings/tanstack-aws/issues/62)  
**Question:** Can the TanStack DS Button look and feel be achieved using shadcn Button + theme tokens + variants/params alone? What is still missing if DS design must win?  
**Researched:** 2026-08-03  
**Upstream pin inspected:** [`TanStack/tanstack.com@bf00919`](https://github.com/TanStack/tanstack.com/commit/bf00919b11adcedd71c0ce39ad8582ce31ddcf11) (`main`)

## Verdict

**No.** Remapping shadcn theme tokens (per [#61](https://github.com/JohannesKonings/tanstack-aws/issues/61) / `docs/research/ds-tokens-to-shadcn.md`) plus extending this app’s CVA `variant` / `size` params on [`src/webapp/components/ui/button.tsx`](../../src/webapp/components/ui/button.tsx) can make **chrome CTAs** (filled primary/secondary, outline-ish ghost, text link) *directionally* closer to TanStack DS — but that path **cannot** reproduce the DS Button’s look and feel as specified in the style book.

If DS design must win, the remaining gaps are structural (orthogonal `color` axis, `gradient` + `subtle-link` variants, lift/touch motion, radius param + defaults, polymorphic `as`) and require either a **substantial rewrite of the shadcn Button shell into a DS-shaped API** or **vendoring the DS Button** from `src/components/ds/ui/`. Theme tokens alone are necessary infrastructure, not a Button solution.

---

## Sources consulted (primary only)

1. DS Button source — [`TanStack/tanstack.com` `src/components/ds/ui/index.tsx`](https://github.com/TanStack/tanstack.com/blob/bf00919b11adcedd71c0ce39ad8582ce31ddcf11/src/components/ds/ui/index.tsx) (Button block: variants, color maps, sizes, rounded, base styles).
2. DS Buttons catalog — [`src/routes/ds.buttons.tsx`](https://github.com/TanStack/tanstack.com/blob/bf00919b11adcedd71c0ce39ad8582ce31ddcf11/src/routes/ds.buttons.tsx) + live [tanstack.com/ds/buttons](https://tanstack.com/ds/buttons) (documents variant×color×size×rounded composition and ≤900px hover-as-rest behavior).
3. DS tokens — [`src/styles/app.css`](https://github.com/TanStack/tanstack.com/blob/bf00919b11adcedd71c0ce39ad8582ce31ddcf11/src/styles/app.css) (`action-*`, `surface-state-*`, `border-focus`, category `*-accent|bright|tint|ink|glow`, `--font-ds-mono`, shadow scale).
4. Supporting chrome — [`src/components/ButtonGroup.tsx`](https://github.com/TanStack/tanstack.com/blob/bf00919b11adcedd71c0ce39ad8582ce31ddcf11/src/components/ButtonGroup.tsx) (group surface; not a substitute for Button).
5. This app’s shadcn Button — [`src/webapp/components/ui/button.tsx`](../../src/webapp/components/ui/button.tsx).
6. This app’s theme — [`src/webapp/styles.css`](../../src/webapp/styles.css) (zinc `--primary` / `--radius` / `@theme inline`).
7. Prior research — `docs/research/ds-tokens-to-shadcn.md` on `research/ds-tokens-to-shadcn` (token remap feasibility + explicit call-out that Button extras are out of remap scope); `docs/research/tanstack-ds-upstream-sources.md` on `research/tanstack-ds-upstream-sources` (DS lives in `ds/ui`, not an npm package).

---

## API surface comparison

| Axis | TanStack DS Button | App shadcn Button |
| --- | --- | --- |
| `variant` | `primary`, `secondary`, `ghost`, `icon`, `link`, `subtle-link`, `gradient` | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` |
| `color` | Orthogonal: `neutral` (default) + `blue|green|red|orange|purple|gray|emerald|cyan|yellow` — **different style maps per variant family** | **None** — color comes only from semantic classes (`bg-primary`, …) |
| `size` | `xs`, `sm`, `md`, `lg`, `icon-sm`, `icon-md` (defaults depend on variant) | `default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg` (fixed heights) |
| `rounded` | Explicit param: `none|md|lg|xl|full`; defaults `md` for xs/sm, `lg` otherwise, `xl` for gradient | No param — `rounded-md` in base / sizes |
| Polymorphism | `as` (e.g. `Link`, `"a"`) | `asChild` + Radix `Slot` |
| Composition model | `twMerge(base, variant, size, rounded, colorStyles)` | `cva` + `cn(buttonVariants({ variant, size }))` |

Name collisions that mislead:

- DS **`primary` default color is `neutral`** → inverse surface (`bg-background-inverse` / `text-text-inverse`), **not** `action-primary` blue.
- shadcn **`default`** → `bg-primary` (today zinc; after #61 remap would be brand blue if `--primary` → `action-primary`).
- DS **`ghost`** is a **bordered** control (`border-border-default`, hover subtle/strong border). shadcn **`ghost`** is borderless hover-fill; DS’s bordered look is closer to shadcn **`outline`**.
- DS **`icon`** is a **variant** (with its own color map + `active:scale-90`). shadcn treats icon as **sizes**.

---

## What theme tokens *can* buy (necessary, not sufficient)

From token-mapping research and `app.css` semantics consumed by the DS Button:

| Concern | Token / class path | Effect on shadcn Button |
| --- | --- | --- |
| Focus ring | `--color-border-focus` → shadcn `--ring` | Closer `focus-visible:ring-*` |
| Secondary fill | `--color-action-secondary` / `-hover` → `--secondary` | Secondary variant fill warms toward DS |
| Destructive fill | `--color-action-destructive` → `--destructive` | Destructive closer to terracotta |
| Accent / muted hover | surface / subtle semantics → `--accent`, `--muted` | Ghost/outline hover surfaces improve |
| Brand CTA fill | `--color-action-primary` → `--primary` | Makes shadcn `default` **blue**, which is DS `color="blue"` primary — **not** DS default `neutral` primary |

Token remap does **not** provide: lift transforms, inset highlight shadows, gradient layers, category glow RGB triplets as Button behavior, `font-ds-mono` subtle-link treatment, or the ≤899px “hover styles as resting state” rule documented on `/ds/buttons`.

---

## What CVA variants/params *can* approximate

Staying on the shadcn Button file, one *could* extend `buttonVariants` to add DS-named variants, sizes, a `rounded` axis, and `compoundVariants` for a color matrix. That is still “variants/params,” but it is **not** stock shadcn — it converges on rewriting the DS Button inside a CVA shell.

| DS feature | Feasible via CVA extension? | Notes |
| --- | --- | --- |
| Secondary / link chrome | Yes | Map classes to `action-secondary*`, underline-offset |
| Ghost ≈ bordered | Partial | Need outline-like classes; rename/remap carefully |
| Primary lift + inset shadow | Partial | Hardcoded shadow/translate strings (DS does this too) — not theme vars |
| Size scale | Partial | Can add `xs`/`md`; DS uses padding+text, shadcn uses fixed `h-*` |
| `rounded` param + defaults | Yes (custom) | Logic lives in component defaults today in DS (`getDefaultRounded`) |
| `color` × `primary|icon|link|gradient` | Painful | Four separate `Record<ButtonColor, string>` maps in DS; CVA `compoundVariants` explode |
| `gradient` | No via theme alone | Needs `--btn-grad-*` from category tokens + multi-stop gradient + glow shadow (in DS source) |
| `subtle-link` | No via theme alone | `font-ds-mono`, uppercase tracking, trailing-SVG translate — needs font token + variant CSS + icon markup convention |
| Touch ≤899px resting=hover | Custom CSS only | Explicit `max-[899px]:…` duplicates in every color/variant string |
| `as` polymorphism | Different API | `asChild` can wrap `Link`; not 1:1 with DS `as={Link}` props model |

---

## Gaps if DS design must win

Ordered by how much they block visual/API parity beyond theme + light variant tweaks:

1. **Orthogonal `color` axis** — 10 colors × variant-specific maps (primary / icon / link / gradient). shadcn has no color param; stuffing this into theme vars collapses brand choice into a single `--primary`.
2. **`gradient` landing CTA** — accent→bright gradient, inset tint highlight, colored glow (`rgb(var(--btn-grad-glow)/…)`), hover lift; wired to **category** tokens, not `--primary`.
3. **`subtle-link`** — mono caps label + trailing icon motion; depends on `--font-ds-mono` and child SVG selectors, not shadcn `link`.
4. **Motion / elevation language** — `hover:-translate-y-px` (or `-0.5`), layered shadows, `active:translate-y-0`, icon `active:scale-90`; shadcn base is `transition-all` without lift.
5. **Default primary = inverse (`neutral`), not brand blue** — remapping `--primary` to `action-primary` actively **diverges** from DS default Button unless a `color` (or dual primary) param exists.
6. **Ghost semantics mismatch** — DS bordered ghost vs shadcn borderless ghost; outline is the nearer twin but still lacks DS hover border-strong + shadow-sm behavior.
7. **Radius system** — DS `rounded` param + size-based defaults (`md` vs `lg` vs gradient `xl`); app `--radius: 0.625rem` + `rounded-md` does not match (token research already noted no DS `--radius` token).
8. **Touch breakpoint rule** — below 900px, brighter/hover treatment is the resting state (catalog copy + pervasive `max-[899px]:` classes). Absent from shadcn.
9. **Polymorphic `as` vs `asChild`** — API / DX gap for 1:1 DS copy-paste and docs examples.
10. **Icon-as-variant vs icon sizes** — different composition model; color styles attach to `variant="icon"` in DS.

Anything short of addressing (1)–(5) will not “read as” the `/ds/buttons` style book even after a perfect semantic color remap.

---

## Practical paths (research only — not a decision)

| Path | Outcome |
| --- | --- |
| **A. Theme remap only** | Colors of existing shadcn variants shift; motion, gradient, color matrix, subtle-link, defaults stay wrong. |
| **B. Theme + extend CVA** | Viable for app chrome if product accepts a **reduced** DS subset (e.g. secondary/ghost/link + one primary definition). Full matrix ≈ reimplementing DS. |
| **C. Vendor DS Button** (`ds/ui`) | Full look/feel + API; keep or dual-run shadcn Button for generated shadcn primitives until migrated. Aligns with upstream Phase 1 copy-paste model ([#60](https://github.com/JohannesKonings/tanstack-aws/issues/60)). |

Path A answers the ticket question with **no**. Path B is only “yes” if the success bar is lowered below DS catalog parity. Path C is the straight line when DS must win.

---

## Answer gist

**Theme tokens + shadcn Button variants/params alone are not enough** for TanStack DS Button parity. Remap helps fills/rings; CVA can fake some chrome variants; **still missing** for DS-wins: the **color × variant matrix**, **gradient CTA**, **subtle-link + mono**, **lift/touch motion**, **inverse default primary**, and **rounded / `as` API**. Prefer vendoring `ds/ui` Button (or an intentional reduced subset with documented deltas) over expecting theme+params to close the gap.
