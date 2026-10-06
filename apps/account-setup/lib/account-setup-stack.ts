import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { githubActionsOidcConfig } from './app-config.ts';
import { GitHubActionsOidcSetup } from './constructs/GitHubActionsOidcSetup.ts';

export class AccountSetupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const gitHubActionsOidcSetup = new GitHubActionsOidcSetup(this, 'GitHubActionsOidcSetup', {
      config: githubActionsOidcConfig,
    });

    new cdk.CfnOutput(this, 'GitHubActionsDeployRoleArn', {
      value: gitHubActionsOidcSetup.deployRole.roleArn,
      description: 'Assume this role from GitHub Actions via OIDC.',
    });

    new cdk.CfnOutput(this, 'GitHubActionsOidcProviderArn', {
      value: gitHubActionsOidcSetup.oidcProvider.openIdConnectProviderArn,
      description: 'GitHub Actions OIDC provider ARN.',
    });
  }
}
