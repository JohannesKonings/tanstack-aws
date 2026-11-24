import { Aws, Validations } from 'aws-cdk-lib';
import {
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { WORKLOAD_REGION } from '../../../../lib/workload-region.ts';
import type { GitHubActionsOidcConfig } from '../app-config.ts';
import { ACCOUNT_KEY_ALIAS } from './AccountKey.ts';
import { ENVS_SECRET_NAME } from './EnvsSecret.ts';
const BOOTSTRAP_QUALIFIER = 'hnb659fds';
const BOOTSTRAP_ROLE_NAMES = [
  'deploy-role',
  'file-publishing-role',
  'image-publishing-role',
  'lookup-role',
  'cfn-exec-role',
] as const;
const REGIONS = ['us-east-1', 'us-east-2'];

function getBootstrapRoleArn(
  roleName: (typeof BOOTSTRAP_ROLE_NAMES)[number],
  region: (typeof REGIONS)[number],
) {
  return `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/cdk-${BOOTSTRAP_QUALIFIER}-${roleName}-${Aws.ACCOUNT_ID}-${region}`;
}

type GitHubActionsOidcSetupProps = {
  config: GitHubActionsOidcConfig;
};

export class GitHubActionsOidcSetup extends Construct {
  public readonly oidcProvider: OpenIdConnectProvider;
  public readonly deployRole: Role;

  constructor(scope: Construct, id: string, props: GitHubActionsOidcSetupProps) {
    super(scope, id);

    this.oidcProvider = new OpenIdConnectProvider(this, 'Provider', {
      url: props.config.oidcUrl,
      clientIds: [props.config.oidcAudience],
    });

    this.deployRole = new Role(this, 'DeployRole', {
      roleName: 'GitHubActionsCdkDeployRole',
      description: `Allows GitHub Actions from ${props.config.allowedRepository} to deploy CDK stacks.`,
      assumedBy: new WebIdentityPrincipal(this.oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': props.config.oidcAudience,
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': props.config.allowedRepositorySub,
        },
      }),
    });

    this.deployRole.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: BOOTSTRAP_ROLE_NAMES.flatMap((roleName) =>
          REGIONS.map((region) => getBootstrapRoleArn(roleName, region)),
        ),
      }),
    );
    this.deployRole.addToPolicy(
      new PolicyStatement({
        actions: ['kms:ListAliases'],
        resources: ['*'],
      }),
    );
    const envsSecretArn = `arn:${Aws.PARTITION}:secretsmanager:${WORKLOAD_REGION}:${Aws.ACCOUNT_ID}:secret:${ENVS_SECRET_NAME}-*`;
    const accountKeyArn = `arn:${Aws.PARTITION}:kms:${WORKLOAD_REGION}:${Aws.ACCOUNT_ID}:key/*`;
    this.deployRole.addToPolicy(
      new PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [envsSecretArn],
      }),
    );
    this.deployRole.addToPolicy(
      new PolicyStatement({
        actions: ['kms:Decrypt', 'kms:DescribeKey'],
        resources: [accountKeyArn],
        conditions: {
          'ForAnyValue:StringEquals': {
            'kms:ResourceAliases': ACCOUNT_KEY_ALIAS,
          },
        },
      }),
    );
    // cdk-nag flattens Fn::Join ARNs before matching appliesTo, so these stay literal strings.
    const envsSecretFinding = `Resource::arn:<AWS::Partition>:secretsmanager:${WORKLOAD_REGION}:<AWS::AccountId>:secret:${ENVS_SECRET_NAME}-*`;
    const accountKeyFinding = `Resource::arn:<AWS::Partition>:kms:${WORKLOAD_REGION}:<AWS::AccountId>:key/*`;

    // IAM5 is reported on the role's default policy. cdk-nag treats an
    // acknowledgment on an ancestor as applying to that child.
    Validations.of(this.deployRole).acknowledge(
      {
        id: 'AwsSolutions-IAM5[Resource::*]',
        reason:
          'kms:ListAliases does not support a resource ARN. The deploy role lists aliases to resolve the account key.',
      },
      {
        id: `AwsSolutions-IAM5[${envsSecretFinding}]`,
        reason:
          'Varlock reads the envs secret while synthesizing account setup. Secrets Manager appends a random suffix to the secret ARN.',
      },
      {
        id: `AwsSolutions-IAM5[${accountKeyFinding}]`,
        reason:
          'The account key id is created in the workload region. Decrypt is limited to the alias/account key by kms:ResourceAliases.',
      },
    );
  }
}
