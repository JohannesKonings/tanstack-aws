# Account Setup

This CDK app contains account-scoped bootstrap resources that future stacks in
this repository can rely on.

## Scope

- GitHub Actions OIDC provider for AWS
- A deploy role that only workflows from `JohannesKonings/tanstack-aws` can
  assume

This folder intentionally does not contain application resources and does not
create a GitHub Actions workflow.

## Prerequisites

- CDK bootstrap must already exist in the target account and region

## Required Environment Variables

- `AWS_ACCOUNT_ID`
- `AWS_REGION`

These values are meant to come from the GitHub Actions environment when the
workflow is added later.

## Usage

From the repository root:

```sh
AWS_ACCOUNT_ID=123456789012 AWS_REGION=us-east-2 pnpm cdk:account synth
```
