# TanStack AWS

TanStack Start application with AWS CDK infrastructure, organized as a Vite+ monorepo.

## UI

**TanStack DS upstream catalog**:
The official copy-paste registry at [tanstack.com/ds](https://tanstack.com/ds). Source of truth when adding or refreshing design tokens and components.
_Avoid_: tanstack.com repo sync, `@tanstack/ds` npm package

**DS registry package** (`packages/tanstack-ds`):
A workspace that publishes TanStack DS components as an external shadcn registry. Apps consume it only via `shadcn add @tanstack-ds/<item>` — never by importing the package directly.
_Avoid_: vendored `src/webapp/ds/**` tree, wipe-overwrite sync script, runtime import from `@tanstack-aws/tanstack-ds`

## Infrastructure

**Workload stack**:
Per-stage application infrastructure (for example `TanstackAwsStack-main`) deployed by the main application CI/CD pipelines.
_Avoid_: App stack, environment stack, service stack

**CloudFront Free plan limit**:
`main` and `prod` distributions stay on CloudFront's Free pricing plan. That plan allows at most five additional cache behaviors beyond the default SSR behavior. Public static files live under `/assets/*` (one behavior); root files like `manifest.json` and `robots.txt` use SSR routes.
_Avoid_: extra cache behaviors per static prefix, root-level public paths outside `/assets/`

## CI/CD

**Dependency update PR**:
Bot-opened pull request that bumps package versions. Runs validation only, with no ephemeral workload deploy.
_Avoid_: Renovate PR, bot PR, dependency bump PR

**Feature deploy**:
Ephemeral workload stack deploy for pull requests that are not dependency updates.
_Avoid_: PR deploy, preview deploy, ephemeral deploy
