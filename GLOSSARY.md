# TanStack AWS

TanStack Start application with AWS CDK infrastructure, organized as a Vite+ monorepo.

## Infrastructure

**Workload stack**:
Per-stage application infrastructure (for example `TanstackAwsStack-main`) deployed by the main application CI/CD pipelines.
_Avoid_: App stack, environment stack, service stack

## CI/CD

**Dependency update PR**:
Bot-opened pull request that bumps package versions. Runs validation only, with no ephemeral workload deploy.
_Avoid_: Renovate PR, bot PR, dependency bump PR

**Feature deploy**:
Ephemeral workload stack deploy for pull requests that are not dependency updates.
_Avoid_: PR deploy, preview deploy, ephemeral deploy
