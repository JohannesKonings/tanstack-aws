# Account Setup

This CDK app contains account-scoped bootstrap resources that future stacks in
this repository can rely on.

## Scope

- GitHub Actions OIDC provider for AWS
- A deploy role that only workflows from `JohannesKonings/tanstack-aws` can
  assume
- Shared Aurora PostgreSQL Serverless v2 cluster (workload-region stack in
  `us-east-2`)
- Mandatory account-wide resource tagging (`ResourceScope=account-wide`)

This folder intentionally does not contain application resources and does not
create a GitHub Actions workflow.

### Shared Aurora SSM Parameters

The workload-region account setup stack publishes connection metadata for
workload stacks under the prefix `/tanstack-aws/shared/aurora/`:

| Parameter           | Description                         |
| ------------------- | ----------------------------------- |
| `.../cluster-arn`   | Aurora cluster ARN                  |
| `.../secret-arn`    | Secrets Manager ARN for credentials |
| `.../database-name` | Default database name               |

Workload stacks resolve these at deploy time and pass them into server Lambda
environments for Data API access.

## Deployment Contract

Account setup stacks are deployed manually and must be applied before
application stack deployments that depend on shared Aurora metadata.

Required deployment order:

1. Global account setup stack (`AccountSetupStack`, `us-east-1`)
2. Workload region account setup stack (`WorkloadRegionAccountSetupStack`,
   `us-east-2`)
3. Application stacks (`TanstackAwsStack-*`, automated through GitHub Actions)

## Prerequisites

- CDK bootstrap must already exist in the target account and region

## Required Environment Variables

- `AWS_ACCOUNT_ID`

`AWS_REGION` is optional and ignored for stack region placement. Regions are
centrally defined in `lib/workload-region.ts`.

## Usage

From the repository root:

```sh
AWS_ACCOUNT_ID=123456789012 vp run cdk:account -- synth
```

Deploy both account setup stacks manually:

```sh
AWS_ACCOUNT_ID=123456789012 vp run cdk:account -- deploy --all
```
