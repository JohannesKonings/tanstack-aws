# ADR-0001: Monorepo migration starting with account setup

## Status

Accepted

## Context

The repository is evolving from a single-package layout into a Vite+ monorepo. Account setup (OIDC, deploy role, shared Aurora) lived at the repository root with manual-only deployment, coupling its validation to the main application CI.

## Decision

Move account setup to `apps/cdk-account-setup` as the first workspace package with:

- Root Vite+ config governing lint, format, and check with package-specific `lint.overrides`
- Oxlint import boundaries separating account setup from application code
- A dedicated GitHub Actions workflow for validate-on-PR, auto-deploy-on-`main`, and manual `workflow_dispatch` deploy

The main TanStack application remains at the repository root in this slice.

## Consequences

- Account setup and application CI are independent; path filters keep unrelated changes fast
- Temporary import exceptions allow account setup to read `lib/workload-region.ts` and `lib/resource-tags.ts` until `packages/infra-shared` is extracted
- Net-new AWS accounts still require a one-time manual bootstrap before the automated pipeline can deploy account setup
