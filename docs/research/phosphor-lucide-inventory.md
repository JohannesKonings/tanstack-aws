# Research: Phosphor on TanStack Start and lucide replacement inventory

**Issue:** [#64](https://github.com/JohannesKonings/tanstack-aws/issues/64)  
**Question:** How should `@phosphor-icons/react` be used with TanStack Start SSR in this app, and what is the full `lucide-react` usage inventory to replace (including `components.json` `iconLibrary`)?  
**Researched:** 2026-08-03

## Verdict

For **this app today**, use `@phosphor-icons/react` with the preferred `*Icon` exports (same pattern as tanstack.com). Classic TanStack Start SSR is **isomorphic**, not RSC — React Context works — so the default (CSR) package entry is appropriate and matches DS usage of `IconContext` for shared weight/size.

Reserve `@phosphor-icons/react/ssr` for **React Server Components** (or any tree where Context is unavailable). This repo’s `components.json` has `"rsc": false` and `vite.config.ts` does not enable Start RSC (`tanstackStart({ rsc: … })`), so `/ssr` is not required for the current migration.

Replace all **20** `lucide-react` import sites (47 unique icons) and flip config: drop the `lucide-react` dependency and stop advertising `"iconLibrary": "lucide"` in `components.json`. Prefer `*Icon` Phosphor names below; bare names still exist but are deprecated in `@phosphor-icons/react@2.1.10`.

---

## Sources consulted (primary)

1. Phosphor React README — [React Server Components and SSR](https://cdn.jsdelivr.net/npm/@phosphor-icons/react@2.1.10/README.md) (package `@phosphor-icons/react@2.1.10`): import from `@phosphor-icons/react/ssr` when Context is unavailable; `/ssr` variants do not inherit `IconContext`.
2. Package exports — [`package.json` exports](https://cdn.jsdelivr.net/npm/@phosphor-icons/react@2.1.10/package.json): `"."`, `"./ssr"`, `"./dist/ssr"`, `"./dist/csr/*"`, deep `"./*"`.
3. Export naming — e.g. [`Trash.d.ts`](https://cdn.jsdelivr.net/npm/@phosphor-icons/react@2.1.10/dist/ssr/Trash.d.ts): `TrashIcon` preferred; bare `Trash` marked `@deprecated`.
4. TanStack Start execution model — [Execution Model](https://tanstack.com/start/latest/docs/framework/react/guide/execution-model): code is isomorphic by default; SSR + client hydration.
5. Local Start skill / config — `node_modules/@tanstack/react-start/skills/react-start/SKILL.md` (isomorphic default); RSC is opt-in (`server-components` skill; `tanstackStart({ rsc: { enabled: true } })`). This app: `vite.config.ts` `tanstackStart({ srcDirectory: 'src/webapp', … })` without RSC; `components.json` `"rsc": false`.
6. Community friction (verify, don’t over-generalize) — [phosphor-icons/react#151](https://github.com/phosphor-icons/react/issues/151) (open): TanStack Start + **Cloudflare Workers** Vite SSR runner panics on `@phosphor-icons/react` (and reporter says `/ssr` also failed). This app targets **Nitro `aws-lambda`**, not that Workers runner — treat #151 as a watch item, not a blocker for Lambda SSR.
7. DS reference usage — [tanstack.com `src/libraries/icons.ts`](https://github.com/TanStack/tanstack.com/blob/main/src/libraries/icons.ts) imports `*Icon` from `@phosphor-icons/react` `^2.1.10`; [DS iconography](https://tanstack.com/ds/iconography).
8. App inventory — ripgrep of `lucide-react` under repo source; `package.json`; `components.json`.
9. shadcn config — [components.json docs](https://ui.shadcn.com/docs/components-json); [schema](https://ui.shadcn.com/schema.json) types `iconLibrary` as a free `string` (no enum of lucide/phosphor). This app’s `src/webapp/components/ui/` (`button`, `badge`) currently has **no** lucide imports — `iconLibrary` mainly affects future CLI generation.

---

## SSR recommendation (for this app)

| Concern | Guidance |
| --- | --- |
| Current Start mode | Isomorphic SSR (Nitro AWS Lambda). Not RSC. |
| Default import | `import { TrashIcon } from '@phosphor-icons/react'` |
| Shared style | Optional root `IconContext.Provider` (e.g. `weight: 'light'`) like tanstack.com mega-menu — only works with CSR entry, not `/ssr`. |
| When to use `/ssr` | RSC trees / Context-forbidden environments: `import { TrashIcon } from '@phosphor-icons/react/ssr'`. |
| Bundle / Vite friction | If barrel import slows or breaks SSR, use deep paths: `@phosphor-icons/react/dist/csr/Trash` (or `/dist/ssr/Trash`). README documents eager transpile of 9k+ modules when bundlers pull the full barrel. |
| #151 (CF Workers) | Open report; different runtime than this app. Smoke-test icons under `vp dev` and Lambda SSR after wiring. |
| Migration order | Add `@phosphor-icons/react` → swap import sites per table → remove `lucide-react` → update `components.json`. |

**Gist:** Prefer default `@phosphor-icons/react` + `*Icon` (+ optional `IconContext`) for this Start app; use `/ssr` only if/when RSC is enabled or Context is unavailable.

---

## Config inventory

| Location | Current | Replacement action |
| --- | --- | --- |
| `package.json` → `dependencies.lucide-react` | `^0.577.0` | Remove after call sites migrated; add `@phosphor-icons/react` (pin `^2.1.10` to match tanstack.com). |
| `components.json` → `iconLibrary` | `"lucide"` | Stop targeting Lucide. Schema accepts any string; **do not assume** the shadcn CLI fully remaps generated icons to Phosphor without verification. Safe approach: set a documented project convention (Phosphor via `@phosphor-icons/react`) and manually fix any future CLI output that still emits `lucide-react`. `"rsc": false` stays unless Start RSC is deliberately enabled. |
| `src/webapp/components/ui/*` | No lucide imports today | No icon rewrites needed in UI primitives for the first pass. |

---

## Lucide → Phosphor replacement map (unique icons)

Suggested Phosphor export is the preferred `*Icon` name from `@phosphor-icons/react@2.1.10`. Glyphs are nearest equivalents (not 1:1 stroke matches).

| Lucide export | Suggested Phosphor export | Notes |
| --- | --- | --- |
| `Briefcase` | `BriefcaseIcon` | |
| `Building2` | `BuildingsIcon` | |
| `Calendar` | `CalendarIcon` | |
| `CheckCircle2` | `CheckCircleIcon` | |
| `ChevronDown` | `CaretDownIcon` | |
| `ChevronRight` | `CaretRightIcon` | |
| `ChevronUp` | `CaretUpIcon` | |
| `Cloud` | `CloudIcon` | |
| `Construction` | `HardHatIcon` | No `ConstructionIcon`; `BarricadeIcon` / `TrafficConeIcon` are alternatives |
| `CreditCard` | `CreditCardIcon` | |
| `Database` | `DatabaseIcon` | |
| `DollarSign` | `CurrencyDollarIcon` | |
| `Edit2` | `PencilSimpleIcon` | Or `NotePencilIcon` |
| `ExternalLink` | `ArrowSquareOutIcon` | |
| `Github` | `GithubLogoIcon` | |
| `Globe` | `GlobeIcon` | |
| `Guitar` | `GuitarIcon` | |
| `Home` | `HouseIcon` | |
| `Landmark` | `BankIcon` | No `LandmarkIcon` in 2.1.10 |
| `Linkedin` | `LinkedinLogoIcon` | |
| `Mail` | `EnvelopeIcon` | |
| `MapPin` | `MapPinIcon` | |
| `Menu` | `ListIcon` | |
| `MessagesSquare` | `ChatCircleIcon` | Or `ChatsIcon` / `ChatTeardropTextIcon` |
| `Network` | `NetworkIcon` | |
| `Pencil` | `PencilIcon` | Or `PencilSimpleIcon` for lighter chrome |
| `Phone` | `PhoneIcon` | |
| `Plus` | `PlusIcon` | |
| `RefreshCw` | `ArrowsClockwiseIcon` | |
| `RouteIcon` | `PathIcon` | Or `SignpostIcon` |
| `Send` | `PaperPlaneRightIcon` | |
| `Server` | `HardDrivesIcon` | |
| `Shield` | `ShieldIcon` | |
| `Sparkles` | `SparkleIcon` | |
| `SquareFunction` | `FunctionIcon` | |
| `Star` | `StarIcon` | Use `weight="fill"` for solid |
| `StickyNote` | `NoteIcon` | |
| `Store` | `StorefrontIcon` | |
| `Trash2` | `TrashIcon` | Or `TrashSimpleIcon` |
| `Twitter` | `XLogoIcon` | Prefer current X mark; `TwitterLogoIcon` still exists |
| `User` | `UserIcon` | |
| `Users` | `UsersIcon` | |
| `Waves` | `WavesIcon` | |
| `Wifi` | `WifiHighIcon` | |
| `WifiOff` | `WifiSlashIcon` | |
| `X` | `XIcon` | Close control (not `XLogoIcon`) |
| `Zap` | `LightningIcon` | |

**Unique lucide icons:** 47.

---

## Import-site inventory (20 files)

| File | Lucide imports |
| --- | --- |
| `src/webapp/routes/index.tsx` | `Cloud`, `Construction`, `Database`, `ExternalLink`, `Globe`, `RouteIcon`, `Server`, `Shield`, `Sparkles`, `Waves`, `Zap` |
| `src/webapp/routes/demo/tanchat.tsx` | `ChevronDown`, `ChevronRight`, `Send` |
| `src/webapp/routes/demo/db-todo.tsx` | `Trash2` |
| `src/webapp/routes/demo/tanstack-query.tsx` | `Trash2` |
| `src/webapp/components/Header.tsx` | `ChevronDown`, `ChevronRight`, `Database`, `Github`, `Guitar`, `Home`, `Menu`, `MessagesSquare`, `Network`, `SquareFunction`, `StickyNote`, `Store`, `Users`, `X` |
| `src/webapp/components/SyncStatus.tsx` | `RefreshCw`, `Wifi`, `WifiOff` |
| `src/webapp/components/example-AIAssistant.tsx` | `ChevronRight`, `Send`, `X` |
| `src/webapp/components/persons/PersonsTable.tsx` | `ChevronDown`, `ChevronUp` |
| `src/webapp/components/persons/PersonDetailPanel.tsx` | `Briefcase`, `Edit2`, `Landmark`, `Mail`, `MapPin`, `Plus`, `Trash2`, `User`, `X` |
| `src/webapp/components/persons/ContactInfoCard.tsx` | `CheckCircle2`, `Linkedin`, `Mail`, `Pencil`, `Phone`, `Star`, `Trash2`, `Twitter` |
| `src/webapp/components/persons/EmploymentCard.tsx` | `Briefcase`, `Building2`, `Calendar`, `DollarSign`, `Pencil`, `Trash2` |
| `src/webapp/components/persons/AddressCard.tsx` | `MapPin`, `Pencil`, `Star`, `Trash2` |
| `src/webapp/components/persons/BankAccountCard.tsx` | `CreditCard`, `Landmark`, `Pencil`, `Star`, `Trash2` |
| `src/webapp/components/persons/ConfirmationModal.tsx` | `X` |
| `src/webapp/components/persons/CreatePersonModal.tsx` | `X` |
| `src/webapp/components/persons/PersonEditModal.tsx` | `X` |
| `src/webapp/components/persons/AddressFormModal.tsx` | `X` |
| `src/webapp/components/persons/ContactFormModal.tsx` | `X` |
| `src/webapp/components/persons/EmploymentFormModal.tsx` | `X` |
| `src/webapp/components/persons/BankAccountFormModal.tsx` | `X` |

**Import sites:** 20.  
**Highest-frequency icons:** `X` (10), `Trash2` (7), `Pencil` (4), `ChevronDown` / `ChevronRight` / `Star` (3 each).

---

## Out of scope / follow-ups

- Implementing the swap (implementation ticket after map decisions).
- Enabling TanStack Start RSC and re-validating `/ssr`.
- Editing wayfinder map #59 Decisions-so-far (parent session).
- Visual QA of Phosphor weight vs current Lucide strokes.
