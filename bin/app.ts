#!/usr/bin/env node
// import * as cdk from 'aws-cdk-lib';
import { App } from 'aws-cdk-lib';
// import { AwsSolutionsChecks, ServerlessChecks } from 'cdk-nag';
import { TanstackAwsStack } from '../lib/tanstack-aws.ts';

const workloadRegion = 'us-east-2';
const workloadAccount = process.env.CDK_DEFAULT_ACCOUNT;

const app = new App();

const appStage = process.env.APP_STAGE || 'dev';

// oxlint-disable-next-line no-console
console.log(`Deploying to stage: ${appStage} in region: ${workloadRegion}`);

new TanstackAwsStack(app, `TanstackAwsStack-${appStage}`, {
  env: { account: workloadAccount, region: workloadRegion },
});

// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
// Aspects.of(app).add(new ServerlessChecks({ verbose: true }));
