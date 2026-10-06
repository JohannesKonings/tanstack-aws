# TanStack AWS

TanStack Start application with AWS CDK infrastructure, organized as a Vite+ monorepo.

## Infrastructure

**Account setup**:
Account-wide bootstrap infrastructure deployed once per AWS account: GitHub Actions OIDC provider, deploy role, and shared Aurora PostgreSQL cluster.
_Avoid_: Bootstrap stack, foundation stack, platform stack

**Workload stack**:
Per-stage application infrastructure (for example `TanstackAwsStack-main`) deployed by the main application CI/CD pipelines.
_Avoid_: App stack, environment stack, service stack
