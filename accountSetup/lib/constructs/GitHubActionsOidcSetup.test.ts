import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../../../test/cdk-snapshot.ts';
import { githubActionsOidcConfig } from '../app-config.ts';
import { GitHubActionsOidcSetup } from './GitHubActionsOidcSetup.ts';

describe('GitHubActionsOidcSetup', () => {
  it('creates the GitHub OIDC provider and a repo-scoped deploy role', () => {
    const stack = new Stack();
    const gitHubActionsOidcSetup = new GitHubActionsOidcSetup(stack, 'GitHubActionsOidcSetup', {
      config: githubActionsOidcConfig,
    });

    const template = Template.fromStack(stack);

    expect(gitHubActionsOidcSetup.oidcProvider).toBeDefined();
    expect(gitHubActionsOidcSetup.deployRole).toBeDefined();

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
      RoleName: 'GitHubActionsCdkDeployRole',
    });

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

    const templateJson = template.toJSON();
    const resourcesJson = JSON.stringify(templateJson.Resources);
    expect(resourcesJson).toContain('cdk-hnb659fds-deploy-role-');
    expect(resourcesJson).toContain('cdk-hnb659fds-file-publishing-role-');
    expect(resourcesJson).toContain('cdk-hnb659fds-image-publishing-role-');
    expect(resourcesJson).toContain('cdk-hnb659fds-lookup-role-');
    expect(resourcesJson).toContain('cdk-hnb659fds-cfn-exec-role-');
    expect(resourcesJson).not.toContain('AdministratorAccess');
    expect(snapshotSafeTemplate(templateJson)).toMatchSnapshot();
  });
});
