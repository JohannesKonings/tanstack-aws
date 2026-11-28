# Account Setup

This CDK app contains account-scoped bootstrap resources that future stacks in
this repository can rely on.

## Scope

- GitHub Actions OIDC provider for AWS
- A deploy role that only workflows from `JohannesKonings/tanstack-aws` can
  assume
- Shared Aurora PostgreSQL Serverless v2 cluster (workload-region stack in
  `us-east-2`)
- Account KMS key (`alias/account`) and Secrets Manager secret `envs` in
  `us-east-2`, read by Varlock
- Mandatory account-wide resource tagging (`ResourceScope=account-wide`)

This package intentionally does not contain application resources.

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

Account setup stacks deploy through the dedicated
[Account Setup workflow](https://github.com/JohannesKonings/tanstack-aws/blob/main/.github/workflows/account-setup.yml).
Both stacks always deploy together.

| Event                                 | CI (check + test) | CDK diff comment | Deploy                            |
| ------------------------------------- | ----------------- | ---------------- | --------------------------------- |
| PR push (account-setup paths)         | Every commit      | Yes (same-repo)  | Manual only (`workflow_dispatch`) |
| Merge to `main` (account-setup paths) | Yes               | No               | Automatic (`deploy --all`)        |
| `workflow_dispatch`                   | No                | No               | Deploy all stacks from any branch |

Fork PRs skip the CDK diff job (no AWS credentials); check and test still run. The diff
comment compares the PR branch against currently deployed account-setup stacks in AWS and
is updated on each push via `cdk-notifier` (`--tag-id account-setup`).

Required deployment order across the repository:

1. Global account setup stack (`AccountSetupStack`, `us-east-1`)
2. Workload region account setup stack (`WorkloadRegionAccountSetupStack`,
   `us-east-2`)
3. Application workload stacks (`TanstackAwsStack-*`, automated through main
   application deploy workflows)

### Bootstrap for net-new accounts

Account setup creates the GitHub OIDC deploy role that subsequent workflows
assume. Net-new AWS accounts require a one-time manual bootstrap before the
automated pipeline can deploy account setup.

## Prerequisites

- CDK bootstrap must already exist in the target account and region

## Required Environment Variables

Varlock loads these from the `envs` secret in `us-east-2` when CDK commands run.
AWS credentials are a prerequisite; the command fails when they are missing.

- `AWS_ACCOUNT_ID`
- `CLOUDWATCH_OMNI_ADMIN_ROLE`

`AWS_REGION` is optional and ignored for stack region placement. Regions are
centrally defined in `lib/workload-region.ts`.

The secret value is a JSON object:

```json
{
  "AWS_ACCOUNT_ID": "123456789012",
  "CLOUDWATCH_OMNI_ADMIN_ROLE": "AWSReservedSSO_AdministratorAccess_example"
}
```

Varlock reads each key (`awsSecret("envs#AWS_ACCOUNT_ID")`,
`awsSecret("envs#CLOUDWATCH_OMNI_ADMIN_ROLE")`). Set
`CLOUDWATCH_OMNI_ADMIN_ROLE` to an IAM role ARN, or to an `AWSReservedSSO_` role
name, to grant that role Space Admin on the Omni space in addition to the
CloudFormation execution role that creates the space.

CDK does not write secret values. `resolveAccountSetupEnv` throws when either
value is missing. Set them in the `envs` secret. A repository `.env` value is
used only when that variable is not already set.

## Usage

From the repository root:

```sh
vp run cdk:account -- synth
```

Deploy both account setup stacks locally:

```sh
vp run cdk:account -- deploy --all
```

Run package-scoped validation:

```sh
vp check apps/cdk-account-setup
vp -C apps/cdk-account-setup run test
```
