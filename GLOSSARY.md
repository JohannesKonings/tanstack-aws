# TanStack AWS

TanStack Start application with AWS CDK infrastructure, organized as a Vite+ monorepo.

## UI

**TanStack DS upstream catalog**:
The official copy-paste registry at [tanstack.com/ds](https://tanstack.com/ds). Source of truth when adding or refreshing design tokens and components.
_Avoid_: tanstack.com repo sync, `@tanstack/ds` npm package

**DS registry package** (`packages/tanstack-ds`):
A workspace that publishes TanStack DS components as an external shadcn registry. Apps consume it only via `shadcn add @tanstack-ds/<item>` — never by importing the package directly.
_Avoid_: vendored `src/webapp/ds/**` tree, wipe-overwrite sync script, runtime import from `@tanstack-aws/tanstack-ds`

## Applications

**Webapp**:
The primary workload UI deployed for each stage — the public-facing TanStack Start application.
_Avoid_: main app, customer app, frontend

**Webapp admin**:
The internal admin console — a separate TanStack Start application for operations and administration.
_Avoid_: admin app, backoffice, dashboard

## Infrastructure

**Shared workload data**:
Per-stage data resources shared by all workload webapps — DynamoDB tables, Aurora schema lifecycle, and events infrastructure. Created at the **Workload stack** level and passed to each webapp construct.
_Avoid_: per-app database, duplicated tables, isolated data layer

**Workload frontend**:
Per-webapp edge and compute resources — Lambda, API Gateway, CloudFront distribution, and S3 assets bucket. Each **Webapp** and **Webapp admin** gets its own **Workload frontend**; data is shared via **Shared workload data**.
_Avoid_: shared Lambda, path-prefix routing on one distribution, monolith frontend

**Deployment unit**:
One CDK deploy per stage that provisions all workload webapps. Each webapp gets its own **Workload frontend**; **Shared workload data** is provisioned once at stack level.
_Avoid_: monolith deploy, shared Lambda, single distribution for all apps

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

## Monorepo follow-up sequence

Planned extraction order after **Webapp admin** placeholder (issue #118 slice 1):

1. Move **Webapp** from `src/webapp/` to `apps/webapp`
2. Extract workload CDK to `apps/cdk-app` (includes `cdk-notifier` PR diff comments)
3. Rename `apps/account-setup` directory to `apps/cdk-account-setup`
4. Wire **Webapp admin** into the **Workload stack** with **Shared workload data** and separate **Workload frontend** per app
