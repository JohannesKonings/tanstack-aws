#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { App, Aspects, Mixins, RemovalPolicies, Tags } from 'aws-cdk-lib';
import { mixins as s3Mixins } from 'aws-cdk-lib/aws-s3';
import { AwsSolutionsChecks, ServerlessChecks } from 'cdk-nag';
import {
  APPLICATION_RESOURCE_SCOPE_TAG_VALUE,
  RESOURCE_SCOPE_TAG_KEY,
} from '../lib/resource-tags.ts';
import { resolveStageLifecycle, resolveStageName } from '../lib/stage-name.ts';
import { TanstackAwsStack } from '../lib/tanstack-aws.ts';
import { WORKLOAD_REGION } from '../lib/workload-region.ts';

const workloadAccount = process.env.CDK_DEFAULT_ACCOUNT;

const app = new App();
Tags.of(app).add(RESOURCE_SCOPE_TAG_KEY, APPLICATION_RESOURCE_SCOPE_TAG_VALUE);

const resolveLocalGitBranch = (): string | undefined => {
  try {
    const branchName = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return branchName && branchName !== 'HEAD' ? branchName : undefined;
  } catch {
    return undefined;
  }
};

const stageSource =
  process.env.APP_STAGE ??
  process.env.GITHUB_HEAD_REF ??
  process.env.GITHUB_REF_NAME ??
  resolveLocalGitBranch();

const appStage = resolveStageName(stageSource, {
  fallbackStage: 'dev',
  lifecycle: 'permanent',
});
const appLifecycle = resolveStageLifecycle(appStage);

// oxlint-disable-next-line no-console
console.log(`Deploying to stage: ${appStage} in region: ${WORKLOAD_REGION}`);

new TanstackAwsStack(app, `TanstackAwsStack-${appStage}`, {
  appStage,
  env: { account: workloadAccount, region: WORKLOAD_REGION },
});

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
Aspects.of(app).add(new ServerlessChecks({ verbose: true }));

if (appLifecycle === 'ephemeral') {
  RemovalPolicies.of(app).destroy();
  Mixins.of(app).apply(new s3Mixins.BucketAutoDeleteObjects());
}
