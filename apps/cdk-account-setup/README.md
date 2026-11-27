# Account Setup

This CDK app contains account-scoped bootstrap resources that future stacks in
this repository can rely on.

## Scope

- GitHub Actions OIDC provider for AWS
- A deploy role that only workflows from `JohannesKonings/tanstack-aws` can
  assume
- Cursor OIDC provider and `GrokBotOpsReadOnlyRole` for the Grok Bot ops
  assistant
- Shared Aurora PostgreSQL Serverless v2 cluster (workload-region stack in
  `us-east-2`)
- Account KMS key (`alias/account`) and Secrets Manager secret `envs` in
  `us-east-2`, read by Varlock
- Mandatory account-wide resource tagging (`ResourceScope=account-wide`)

This package intentionally does not contain application resources.

### Grok Bot ops role

`AccountSetupStack` (`us-east-1`) creates an IAM OIDC provider for issuer
`https://api.cursor.com` and the role `GrokBotOpsReadOnlyRole`. Discovery is
`https://api.cursor.com/.well-known/openid-configuration`. JWKS is
`https://api.cursor.com/keys`.

Johannes's ops assistant, a Grok Bot on Cursor-managed infrastructure, assumes
this role with `AssumeRoleWithWebIdentity` and a Cursor OIDC token. There is no
long-lived access key. The bot mints a token with audience `sts.amazonaws.com`
([Cursor OIDC docs](https://cursor.com/docs/cloud-agent/identity)) and exchanges
it with STS. The maximum session is 1 hour.

Trust is an exact match. There is no wildcard:

- `api.cursor.com:aud` = `sts.amazonaws.com`
- `api.cursor.com:sub` = `user:155323293`

Override the subject with stack prop `cursorOidcSubject`, or with CDK context
`-c cursorOidcSubject=user:123`. The prop wins. Synth rejects a subject that
contains `*`, `?`, or whitespace. Outputs are `GrokBotOpsReadOnlyRoleArn` and
`GrokBotOpsOidcProviderArn`.

```sh
aws sts assume-role-with-web-identity \
  --role-arn "$GROK_BOT_OPS_READ_ONLY_ROLE_ARN" \
  --role-session-name grok-bot-ops \
  --web-identity-token "$CURSOR_OIDC_TOKEN" \
  --duration-seconds 3600
```

Permissions are AWS managed `ReadOnlyAccess`, plus Cost Explorer reads
(`ce:Get*`, `ce:Describe*`, `ce:List*`). Cost Explorer does not support
resource-level permissions, so those actions use `Resource: *`.

An explicit deny blocks secret and data-plane reads that `ReadOnlyAccess`
includes. Describe and list calls stay allowed. That includes Secrets Manager
`DescribeSecret` and `ListSecrets`, SSM parameter names, S3 bucket listings,
CloudWatch logs, metrics, and alarms, CloudFormation describe and drift-status
reads, RDS describe, and X-Ray reads.

The deny also covers the obvious bypasses of those reads: `BatchGetSecretValue`,
`ssm:GetParameter*` (values and history), `kms:Decrypt`, `ec2:GetPasswordData`,
`ecr:GetAuthorizationToken`, S3 object bytes (`GetObject` plus version,
attributes, torrent, and `SelectObjectContent`), DynamoDB item reads (`GetItem`,
`BatchGetItem`, `Query`, `Scan`, PartiQL, and `Execute*`) and stream records,
RDS Data API statements, Redshift Data API statements and results, and Lambda code or environment
(`GetFunction`, `GetFunctionConfiguration`, `GetLayerVersion`).

`cloudformation:DetectStackDrift` and `DetectStackResourceDrift` are allowed on
every stack in the account. Those calls start a drift check. They leave stack
resources unchanged. `ReadOnlyAccess` already includes the describe calls that
read drift status.

Log groups in this repository use default CloudWatch Logs encryption, so the
role can read them without `kms:Decrypt`. A log group that uses a
customer-managed key would require `kms:Decrypt`, which this role denies.

The role deploys with `AccountSetupStack` through the Account Setup workflow
(`cdk deploy --all` on merge to `main`). For this repository that workflow
targets the examples-tanstack account `412827817239`. Local deploys use the
commands in Usage below.

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

- `AWS_ACCOUNT_ID` (for local synth/deploy)
- `CLOUDWATCH_OMNI_ADMIN_ROLE`

`AWS_REGION` is optional and ignored for stack region placement. Regions are
centrally defined in `lib/workload-region.ts`.

Add `CLOUDWATCH_OMNI_ADMIN_ROLE` in the `envs` secret in the `us-east-2`
console. The secret value is a JSON object:

```json
{ "CLOUDWATCH_OMNI_ADMIN_ROLE": "AWSReservedSSO_AdministratorAccess_example" }
```

Varlock reads that key (`awsSecret("envs#CLOUDWATCH_OMNI_ADMIN_ROLE")`) when
commands run through `scripts/with-env.ts`. Set the value to an IAM role ARN,
or to an `AWSReservedSSO_` role name, to grant that role Space Admin on the
Omni space in addition to the CloudFormation execution role that creates the
space.

CDK does not write secret values. `resolveAccountSetupEnv` throws when
`CLOUDWATCH_OMNI_ADMIN_ROLE` is missing. Set it in the `envs` secret, the
repository `.env`, or the GitHub Actions variable `CLOUDWATCH_OMNI_ADMIN_ROLE`.

## Usage

From the repository root:

```sh
AWS_ACCOUNT_ID=123456789012 vpx scripts/with-env.ts -- vp -C apps/cdk-account-setup exec cdk synth
```

Deploy both account setup stacks locally:

```sh
AWS_ACCOUNT_ID=123456789012 vpx scripts/with-env.ts -- vp -C apps/cdk-account-setup exec cdk deploy --all
```

Or via the root script alias:

```sh
AWS_ACCOUNT_ID=123456789012 vp run cdk:account -- deploy --all
```

Run package-scoped validation:

```sh
vp check apps/cdk-account-setup
vp -C apps/cdk-account-setup test
```
