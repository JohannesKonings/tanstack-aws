import { Aws } from 'aws-cdk-lib';
import {
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import type { GitHubActionsOidcConfig } from '../app-config.ts';
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

    NagSuppressions.addResourceSuppressions(
      this.deployRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'kms:ListAliases with * required for CDK bootstrap cross-region deploy; CDK design.',
        },
      ],
      true,
    );
  }
}
