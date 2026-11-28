import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ArnPrincipal, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Alias, Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export const ACCOUNT_KEY_ALIAS = 'alias/account';

const BOOTSTRAP_QUALIFIER = 'hnb659fds';

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

    const { account, partition, region } = Stack.of(this);
    const bootstrapRoleArn = (roleName: 'deploy-role' | 'cfn-exec-role') =>
      `arn:${partition}:iam::${account}:role/cdk-${BOOTSTRAP_QUALIFIER}-${roleName}-${account}-${region}`;

    // Stack refactor calls kms:DescribeKey while moving this key between stacks.
    // The bootstrap roles are not created here, so the key policy names them directly.
    this.key.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AllowStackRefactorDescribeKey',
        principals: [
          new ArnPrincipal(bootstrapRoleArn('deploy-role')),
          new ArnPrincipal(bootstrapRoleArn('cfn-exec-role')),
          new ServicePrincipal('cloudformation.amazonaws.com'),
        ],
        actions: ['kms:DescribeKey'],
        resources: ['*'],
      }),
    );

    new Alias(this, 'Alias', {
      aliasName: ACCOUNT_KEY_ALIAS,
      targetKey: this.key,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
