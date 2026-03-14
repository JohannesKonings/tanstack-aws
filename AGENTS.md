# AGENTS.md

## Cursor Cloud specific instructions

### Overview

TanStack AWS is a single TanStack Start (React SSR) application built with Vite + Nitro. It showcases TanStack libraries (Start, Router, DB, AI, Query, Store, Form, Table) with AWS services. There is no monorepo structure — one `package.json` at the root, pnpm as the package manager.

### Running the app

- **Dev server**: `pnpm webapp:dev` — starts Vite on port 3000
- **Lint**: `pnpm lint` (oxlint with type-aware rules) — pre-existing warnings/errors exist in the codebase
- **Format check**: `pnpm format:check` (oxfmt)
- **Tests**: `pnpm test` (vitest) — runs CDK infrastructure tests in `accountSetup/`
- **TypeScript check**: `pnpm compile` (tsc --noEmit)
- **Build**: `pnpm webapp:build`

### AWS dependency notes

- Several demos (`/demo/db-todo`, `/demo/db-person`, `/demo/trpc-todo`, `/demo/tanchat`) require live AWS credentials and DynamoDB tables. Without them, these routes will error on the server side.
- Routes that work **without** AWS credentials: `/`, `/demo/store`, `/demo/start.ssr.*`, `/demo/start.server-funcs`, `/demo/start.api-request`, `/example/guitars/*`, `/demo/tanstack-query`.
- There is no local DynamoDB emulator or Docker setup. All AWS access is direct via the SDK.

### Gotchas

- `pnpm install` may warn about ignored esbuild build scripts. The esbuild binary still works — this can be safely ignored.
- `pnpm test` emits CJS/ESM compatibility warnings (`module is not defined`, `exports is not defined`) from react/nitro dependencies. Tests still pass. The Vite server may hang after tests finish — exit code 0 is reliable.
- The `vitest` config is inferred from `vite.config.ts` (no separate vitest config file).
