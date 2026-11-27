# Account Setup

Account-wide bootstrap CDK package: OIDC, deploy role, shared Aurora, log retention, CloudWatch Omni, and agent spaces for all workload stacks in this repository.

## Infrastructure

**Account setup**:
Account-wide bootstrap infrastructure deployed once per AWS account: GitHub Actions OIDC provider, deploy role, Cursor OIDC provider, Grok Bot ops role, shared Aurora PostgreSQL cluster, account-level log retention, CloudWatch Omni, and agent spaces.
_Avoid_: Bootstrap stack, foundation stack, platform stack

**Account setup stack**:
The global account setup stack (`AccountSetupStack`) deployed in `us-east-1` for the GitHub Actions OIDC provider and deploy role, the Cursor OIDC provider, the Grok Bot ops role, and the account-level log retention policy in that region.
_Avoid_: Global stack, OIDC stack

**Grok Bot ops role**:
The read-only IAM role the Cursor Grok Bot ops assistant assumes with a Cursor OIDC token.
_Avoid_: Ops bot role, assistant role, Grok deploy role

**Workload region account setup stack**:
The workload-region account setup stack (`WorkloadRegionAccountSetupStack`) deployed in `us-east-2` for shared Aurora, SSM connection metadata, the account-level log retention policy in that region, CloudWatch Omni, and agent spaces.
_Avoid_: Regional stack, Aurora stack

## Observability

**Account-level log retention policy**:
A CloudWatch Logs retention rule for every log group in a region where an account setup stack is deployed, including log groups that already exist.
_Avoid_: Account-wide log retention, log group retention

**CloudWatch Omni setup**:
The Omni domain and space for this account in the workload region, with IAM as the only sign-in method.
_Avoid_: Omni activation, Omni toggle

**Agent spaces**:
The Security Agent space and the DevOps Agent space in the workload region. Each space can be present or absent on its own.
_Avoid_: Security and devops agent, the agent
