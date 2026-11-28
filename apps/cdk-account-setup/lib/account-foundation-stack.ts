import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { AccountKey } from './constructs/AccountKey.ts';
import { EnvsSecret } from './constructs/EnvsSecret.ts';

/** Account KMS key and the `envs` secret in the workload region. Deploys on its own. */
export class AccountFoundationStack extends Stack {
  public readonly key: Key;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const accountKey = new AccountKey(this, 'AccountKey');
    this.key = accountKey.key;

    new EnvsSecret(this, 'EnvsSecret', {
      encryptionKey: accountKey.key,
    });
  }
}
