#!/usr/bin/env node
// import * as cdk from 'aws-cdk-lib';
import { App, Aspects, Mixins, RemovalPolicies } from 'aws-cdk-lib';
import { mixins as s3Mixins } from 'aws-cdk-lib/aws-s3';
import { AwsSolutionsChecks, ServerlessChecks } from 'cdk-nag';
import { resolveStageLifecycle, resolveStageName } from '../lib/stage-name.ts';
import { TanstackAwsStack } from '../lib/tanstack-aws.ts';

const workloadRegion = 'us-east-2';
const workloadAccount = process.env.CDK_DEFAULT_ACCOUNT;

const app = new App();

const appStage = resolveStageName(process.env.APP_STAGE, {
  fallbackStage: 'dev',
  lifecycle: 'permanent',
});
const appLifecycle = resolveStageLifecycle(appStage);

// oxlint-disable-next-line no-console
console.log(`Deploying to stage: ${appStage} in region: ${workloadRegion}`);

const stack = new TanstackAwsStack(app, `TanstackAwsStack-${appStage}`, {
  appStage,
  env: { account: workloadAccount, region: workloadRegion },
});

if (appLifecycle === 'ephemeral') {
  RemovalPolicies.of(app).destroy();
  Mixins.of(app).apply(new s3Mixins.BucketAutoDeleteObjects());
}

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
Aspects.of(app).add(new ServerlessChecks({ verbose: true }));
