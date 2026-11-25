#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Tags, Validations } from 'aws-cdk-lib';
import { AwsSolutionsChecks, ServerlessChecks } from 'cdk-nag';
import {
  ACCOUNT_RESOURCE_SCOPE_TAG_VALUE,
  RESOURCE_SCOPE_TAG_KEY,
} from '../../../lib/resource-tags.ts';
import { GLOBAL_SERVICES_REGION, WORKLOAD_REGION } from '../../../lib/workload-region.ts';
import { AccountSetupStack } from '../lib/account-setup-stack.ts';
import { resolveAccountSetupEnv } from '../lib/app-config.ts';
import { createAccountSetupApp } from '../lib/cdk-app.ts';
import { WorkloadRegionAccountSetupStack } from '../lib/workload-region-account-setup-stack.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
loadRepoEnv(join(repoRoot, '.env'));

const app = createAccountSetupApp();
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
  cloudWatchOmniAdminRoleArn: accountSetupEnv.CLOUDWATCH_OMNI_ADMIN_ROLE_ARN,
});

function loadRepoEnv(path: string): void {
  let contents: string;
  try {
    contents = readFileSync(path, 'utf8');
  } catch {
    return;
  }

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));
Validations.of(app).addPlugins(new ServerlessChecks(app, { verbose: true }));
