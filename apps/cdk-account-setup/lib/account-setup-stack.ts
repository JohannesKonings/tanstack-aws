import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CURSOR_OIDC_SUBJECT_CONTEXT_KEY,
  cursorOidcConfig,
  githubActionsOidcConfig,
  resolveCursorOidcSubject,
} from './app-config.ts';
import { GitHubActionsOidcSetup } from './constructs/GitHubActionsOidcSetup.ts';
import { GrokBotOpsReadOnlySetup } from './constructs/GrokBotOpsReadOnlySetup.ts';

export interface AccountSetupStackProps extends cdk.StackProps {
  /**
   * Exact Cursor OIDC `sub` allowed to assume the Grok Bot ops role.
   * Overrides CDK context `cursorOidcSubject`. Defaults to `user:155323293`.
   */
  readonly cursorOidcSubject?: string;
}

export class AccountSetupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AccountSetupStackProps) {
    super(scope, id, props);

    // Deferred until CloudFormation AWS::Logs::AccountPolicy supports RETENTION_POLICY.
    // new AccountLogRetentionPolicy(this, 'AccountLogRetentionPolicy');

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

    const grokBotOpsReadOnlySetup = new GrokBotOpsReadOnlySetup(this, 'GrokBotOpsReadOnlySetup', {
      config: {
        oidcUrl: cursorOidcConfig.oidcUrl,
        oidcAudience: cursorOidcConfig.oidcAudience,
        allowedSubject: resolveCursorOidcSubject({
          prop: props?.cursorOidcSubject,
          context: this.node.tryGetContext(CURSOR_OIDC_SUBJECT_CONTEXT_KEY),
        }),
      },
    });

    new cdk.CfnOutput(this, 'GrokBotOpsReadOnlyRoleArn', {
      value: grokBotOpsReadOnlySetup.role.roleArn,
      description: 'Assume this role from the Cursor Grok Bot ops assistant via OIDC.',
    });

    new cdk.CfnOutput(this, 'GrokBotOpsOidcProviderArn', {
      value: grokBotOpsReadOnlySetup.oidcProvider.openIdConnectProviderArn,
      description: 'Cursor OIDC provider ARN for the Grok Bot ops role.',
    });
  }
}
