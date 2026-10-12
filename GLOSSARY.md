# TanStack AWS

TanStack Start application with AWS CDK infrastructure, organized as a Vite+ monorepo.

## UI

**TanStack DS upstream catalog**:
The official copy-paste registry at [tanstack.com/ds](https://tanstack.com/ds). Source of truth when adding or refreshing design tokens and components.
_Avoid_: tanstack.com repo sync, `@tanstack/ds` npm package

**DS registry package** (`packages/tanstack-ds`):
A workspace that publishes TanStack DS components as an external shadcn registry. Apps consume it only via `shadcn add @tanstack-ds/<item>` — never by importing the package directly.
_Avoid_: vendored `apps/webapp/src/ds/**` tree, wipe-overwrite sync script, runtime import from `@tanstack-aws/tanstack-ds`

## Applications

**Webapp**:
The primary workload UI deployed for each stage — the public-facing TanStack Start application.
_Avoid_: main app, customer app, frontend

**Webapp admin**:
The internal admin console — a separate TanStack Start application for operations and administration.
_Avoid_: admin app, backoffice, dashboard

## Persons demos

**Person**:
A demo subject with identity fields plus related addresses, bank accounts, contacts, and employment records. **DynamoDB persons** and **Aurora persons** are the same person shape.
_Avoid_: user, profile, contact

**DB Persons**:
The webapp demo area that presents **DynamoDB persons** and **Aurora persons** as one navigation group.
_Avoid_: persons demo, db-person

**DynamoDB persons**:
The **Person** aggregate stored in the stage DynamoDB persons table.
_Avoid_: DB persons, ElectroDB persons

**Aurora persons**:
The **Person** aggregate stored in the **stage database**.
_Avoid_: Postgres persons, RDS persons

**DB Aurora**:
The webapp-admin view of how many rows each table in the **stage database** holds.
_Avoid_: aurora admin, database counts

## Infrastructure

**Stage database**:
The PostgreSQL database on the shared Aurora cluster that belongs to one workload stage. Person tables live in its `default` schema.
_Avoid_: stage schema, per-stage schema

**Maintenance database**:
The `tanstackaws` database used to create and drop a **stage database**. It does not hold person tables.
_Avoid_: shared database, cluster database

**Shared workload data**:
Per-stage data resources shared by all workload webapps — DynamoDB tables, a **stage database**, and events infrastructure. Created at the **Workload stack** level and passed to each webapp construct.
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

1. Move **Webapp** from `src/webapp/` to `apps/webapp` (done — #120)
2. Extract workload CDK to `apps/cdk-app` (includes `cdk-notifier` PR diff comments)
3. Rename `apps/account-setup` directory to `apps/cdk-account-setup` (done — #122)
4. Wire **Webapp admin** into the **Workload stack** with **Shared workload data** and separate **Workload frontend** per app
