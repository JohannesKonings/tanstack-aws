import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vite-plus/test';
import { AccountSetupStack } from './account-setup-stack.ts';
import { githubActionsOidcConfig, resolveAccountSetupEnv } from './app-config.ts';

describe('resolveAccountSetupEnv', () => {
  it('uses AWS account and region from environment variables', () => {
    expect(
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        AWS_REGION: 'us-east-2',
      }),
    ).toEqual({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: 'us-east-2',
    });
  });

  it('throws when AWS_ACCOUNT_ID is missing', () => {
    expect(() =>
      resolveAccountSetupEnv({
        AWS_REGION: 'us-east-2',
      }),
    ).toThrow('Missing required environment variable: AWS_ACCOUNT_ID');
  });

  it('falls back to CDK defaults when AWS env vars are missing', () => {
    expect(
      resolveAccountSetupEnv({
        CDK_DEFAULT_ACCOUNT: '123456789012',
        CDK_DEFAULT_REGION: 'us-east-2',
      }),
    ).toEqual({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: 'us-east-2',
    });
  });

  it('falls back to AWS_DEFAULT_REGION when AWS_REGION is missing', () => {
    expect(
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        AWS_DEFAULT_REGION: 'us-east-2',
      }),
    ).toEqual({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: 'us-east-2',
    });
  });

  it('throws when AWS_REGION is missing', () => {
    expect(() =>
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
      }),
    ).toThrow('Missing required environment variable: AWS_REGION');
  });

  it('throws when AWS_ACCOUNT_ID is not a 12-digit account id', () => {
    expect(() =>
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '12345',
        AWS_REGION: 'us-east-2',
      }),
    ).toThrow('AWS_ACCOUNT_ID must be a 12-digit AWS account ID');
  });

  it('throws when AWS_REGION does not look like an AWS region', () => {
    expect(() =>
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        AWS_REGION: 'invalid-region',
      }),
    ).toThrow('AWS_REGION must look like an AWS region, for example us-east-2');
  });
});

describe('AccountSetupStack', () => {
  it('creates GitHub OIDC deployment resources for this repository only', () => {
    const app = new App();
    const stack = new AccountSetupStack(app, 'AccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
      Url: githubActionsOidcConfig.oidcUrl,
      ClientIDList: [githubActionsOidcConfig.oidcAudience],
    });

    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Effect: 'Allow',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': githubActionsOidcConfig.oidcAudience,
              },
              StringLike: {
                'token.actions.githubusercontent.com:sub':
                  githubActionsOidcConfig.allowedRepositorySub,
              },
            },
          }),
        ]),
      },
    });

    const templateJson = template.toJSON();
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
          }),
        ]),
      },
    });

    const resourcesJson = JSON.stringify(templateJson.Resources);
    expect(resourcesJson).toContain('cdk-hnb659fds-deploy-role-');
    expect(resourcesJson).toContain('cdk-hnb659fds-file-publishing-role-');
    expect(resourcesJson).toContain('cdk-hnb659fds-image-publishing-role-');
    expect(resourcesJson).toContain('cdk-hnb659fds-lookup-role-');
    expect(resourcesJson).toContain('cdk-hnb659fds-cfn-exec-role-');
    expect(resourcesJson).not.toContain('AdministratorAccess');
    expect(templateJson.Outputs).toHaveProperty('GitHubActionsDeployRoleArn');
    expect(templateJson.Outputs).toHaveProperty('GitHubActionsOidcProviderArn');
  });
});
