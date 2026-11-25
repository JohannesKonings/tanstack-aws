import { RemovalPolicy } from 'aws-cdk-lib';
import { Alias, Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export const ACCOUNT_KEY_ALIAS = 'alias/account';

/** Customer managed key for this account in the workload region. */
export class AccountKey extends Construct {
  public readonly key: Key;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.key = new Key(this, 'Key', {
      description: 'Account key for this workload region.',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    new Alias(this, 'Alias', {
      aliasName: ACCOUNT_KEY_ALIAS,
      targetKey: this.key,
    });
  }
}
