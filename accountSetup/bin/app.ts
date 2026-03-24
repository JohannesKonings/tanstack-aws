#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib';
import {
  ACCOUNT_RESOURCE_SCOPE_TAG_VALUE,
  RESOURCE_SCOPE_TAG_KEY,
} from '../../lib/resource-tags.ts';
import { GLOBAL_SERVICES_REGION, WORKLOAD_REGION } from '../../lib/workload-region.ts';
import { AccountSetupStack } from '../lib/account-setup-stack.ts';
import { resolveAccountSetupEnv } from '../lib/app-config.ts';
import { WorkloadRegionAccountSetupStack } from '../lib/workload-region-account-setup-stack.ts';

const app = new App();
Tags.of(app).add(RESOURCE_SCOPE_TAG_KEY, ACCOUNT_RESOURCE_SCOPE_TAG_VALUE);
const accountSetupEnv = resolveAccountSetupEnv();

new AccountSetupStack(app, 'AccountSetupStack', {
  env: {
    account: accountSetupEnv.AWS_ACCOUNT_ID,
    region: GLOBAL_SERVICES_REGION,
  },
});

new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
  env: {
    account: accountSetupEnv.AWS_ACCOUNT_ID,
    region: WORKLOAD_REGION,
  },
});

// TODO: implement later
// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
// Aspects.of(app).add(new ServerlessChecks({ verbose: true }));
