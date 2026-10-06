# Account Setup

Account-wide bootstrap CDK package: OIDC, deploy role, and shared Aurora for all workload stacks in this repository.

## Infrastructure

**Account setup**:
Account-wide bootstrap infrastructure deployed once per AWS account: GitHub Actions OIDC provider, deploy role, and shared Aurora PostgreSQL cluster.
_Avoid_: Bootstrap stack, foundation stack, platform stack

**Account setup stack**:
The global account setup stack (`AccountSetupStack`) deployed in `us-east-1` for OIDC and the GitHub Actions deploy role.
_Avoid_: Global stack, OIDC stack

**Workload region account setup stack**:
The workload-region account setup stack (`WorkloadRegionAccountSetupStack`) deployed in `us-east-2` for shared Aurora and SSM connection metadata.
_Avoid_: Regional stack, Aurora stack
