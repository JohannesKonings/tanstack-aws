# AGENTS.md

- Keep this file concise and global. If guidance is file/domain-specific, put it in `.cursor/rules/*.mdc`.

## Cursor Cloud specific instructions

### Overview

TanStack AWS is a Vite+ monorepo. Workspace apps under `apps/*` include the primary **Webapp** (`apps/webapp`), **Webapp admin** (`apps/webapp-admin`), workload CDK (`apps/cdk-app`), and account-setup CDK (`apps/cdk-account-setup`). Shared libraries live under `packages/*`. pnpm manages the workspace; root `vite.config.ts` governs lint, format, and check across packages.

Package-scoped commands use `vp -C <package-path>`, for example `vp -C apps/cdk-account-setup run test`. Workspace tests are `vp run -r test`.

## Global conventions

- Use `vp` for package, build, lint, and test commands. Do not run `pnpm`, `npm`, or `yarn` directly.
- TypeScript: do not use `any` or `as` casts to silence type errors unless unavoidable and justified.
- Before completing substantial code changes, run `vp check` and `vp test`.

## Rules index

- CDK lifecycle + workflow stage handling: `.cursor/rules/cdk-stage-lifecycle.mdc`
- CloudFront/WAF retention behavior: `.cursor/rules/cdk-cloudfront-webacl-retention.mdc`

## Agent skills

Matt Pocock engineering skills live in `.agents/skills/`. Sync with `npx skills update -p` (or `vp dlx skills@latest update -p`). Restore from lockfile: `npx skills experimental_install`.

- **Setup**: run `/setup-matt-pocock-skills` once after changing tracker or domain-doc layout.
- **Code review**: prefer `/code-review` (standards + spec). Use `/review-security` only for security-focused review. When the diff touches `docs/`, also run the review steps of `/docs-diagrams`.
- **Docs diagrams**: `/docs-diagrams` draws and syncs the GitHub Pages diagrams in `docs/diagrams/` (wraps the third-party `diagram-design` skill, pinned in `skills-lock.json`).
- **Tests**: prefer `/tdd` for feature work; run `vp check` and `vp test` per global conventions below.

### Issue tracker

GitHub Issues on `JohannesKonings/tanstack-aws`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `GLOSSARY-MAP.md` points at per-context `GLOSSARY.md` files and `docs/adr/`. See `docs/agents/domain.md`.

<!-- intent-skills:start -->

# Skill mappings — when working in these areas, load the linked skill file into context.

skills:

- task: "building or changing TanStack Start routes, server functions, and route handlers"
  load: "node_modules/@tanstack/react-start/skills/react-start/SKILL.md"
- task: "implementing TanStack DB collections and React DB live queries"
  load: "node_modules/@tanstack/react-db/skills/react-db/SKILL.md"
- task: "configuring TanStack Devtools Vite plugin integration"
  load: "node_modules/@tanstack/devtools-vite/skills/devtools-vite-plugin/SKILL.md"
- task: "instrumenting custom devtools events and typed event clients"
  load: "node_modules/@tanstack/devtools-event-client/skills/devtools-event-client/SKILL.md"
- task: "working with Nitro server runtime and deployment behavior"
  load: "node_modules/nitro/skills/nitro/SKILL.md"

<!-- intent-skills:end -->

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

### Dev environment caveats

- **Node.js 24.14.0** is required (see `.node-version`). The `vp` CLI must be installed via the official installer: `curl -fsSL https://vite.plus | bash` (see https://viteplus.dev/guide/).
- **Dev server**: `vp dev --port 3000`. Many demo pages (Store, Guitars, Start server functions with in-memory data) work without AWS credentials. DB-backed pages (Todos DynamoDB, Persons) require DynamoDB, and AI chat requires Bedrock.
- **pnpm build script warning**: `pnpm approve-builds` warning for esbuild can be safely ignored — esbuild pre-built binaries work without running its install script.
- **Test suite**: `vp test` runs 2 test files (9 tests total, CDK constructs). A "hanging-process" warning appears after tests pass — this is benign and does not affect results.
- **Lint**: `vp lint` reports pre-existing warnings/errors in the codebase. Use `vp check` for the full format + lint + type-check suite.
