#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { resolveAccountSetupEnv } from '../lib/app-config.ts';
import { AccountSetupStack } from '../lib/account-setup-stack.ts';

const app = new App();
const accountSetupEnv = resolveAccountSetupEnv();

new AccountSetupStack(app, 'AccountSetupStack', {
  env: {
    account: accountSetupEnv.AWS_ACCOUNT_ID,
    region: accountSetupEnv.AWS_REGION,
  },
});
