import { Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { IConstruct } from 'constructs';
import { ACCOUNT_KEY_ALIAS } from '../../../lib/account-key.ts';

/** Decrypt a secret encrypted with `alias/account`. Secrets Manager uses the caller's KMS permissions. */
export const accountKeyDecryptStatement = (scope: IConstruct): PolicyStatement => {
  const { account, partition, region } = Stack.of(scope);

  return new PolicyStatement({
    actions: ['kms:Decrypt', 'kms:DescribeKey'],
    conditions: {
      'ForAnyValue:StringEquals': {
        'kms:ResourceAliases': ACCOUNT_KEY_ALIAS,
      },
    },
    effect: Effect.ALLOW,
    resources: [`arn:${partition}:kms:${region}:${account}:key/*`],
  });
};
