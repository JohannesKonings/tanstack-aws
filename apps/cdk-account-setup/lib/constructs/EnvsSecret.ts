import { RemovalPolicy, Validations } from 'aws-cdk-lib';
import type { IKey } from 'aws-cdk-lib/aws-kms';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import {} from 'cdk-nag';
import { Construct } from 'constructs';

export const ENVS_SECRET_NAME = 'envs';

export type EnvsSecretProps = {
  readonly encryptionKey: IKey;
};

/**
 * Secrets Manager secret `envs`. JSON object keyed by variable name.
 * Values are edited in the console. CloudFormation sets a placeholder only on
 * creation and leaves later console updates in place.
 */
export class EnvsSecret extends Construct {
  public readonly secret: Secret;

  constructor(scope: Construct, id: string, props: EnvsSecretProps) {
    super(scope, id);

    this.secret = new Secret(this, 'Secret', {
      secretName: ENVS_SECRET_NAME,
      description: 'Account environment values. JSON object keyed by variable name.',
      encryptionKey: props.encryptionKey,
      removalPolicy: RemovalPolicy.RETAIN,
      generateSecretString: {
        secretStringTemplate: '{}',
        generateStringKey: 'initial',
      },
    });
    Validations.of(this.secret).acknowledge({
      id: 'AwsSolutions-SMG4',
      reason:
        'The envs secret stores account configuration, not a rotating credential. Values change by an explicit put, not on a schedule.',
    });
  }
}
