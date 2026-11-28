import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../../../tooling/cdk-snapshot.ts';
import { AccountSetupStack } from './account-setup-stack.ts';
import { githubActionsOidcConfig, resolveAccountSetupEnv } from './app-config.ts';
import { createAccountSetupApp } from './cdk-app.ts';
import { WorkloadRegionAccountSetupStack } from './workload-region-account-setup-stack.ts';

const ACCOUNT_ID = '123456789012';
const WORKLOAD_REGION = 'us-east-2';
const OMNI_ADMIN_ROLE_NAME = 'AWSReservedSSO_AdministratorAccess_example';
const OMNI_ADMIN_ROLE_ARN = `arn:aws:iam::${ACCOUNT_ID}:role/aws-reserved/sso.amazonaws.com/${OMNI_ADMIN_ROLE_NAME}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resourceProperties(template: Template, type: string): Record<string, unknown>[] {
  return Object.values(template.findResources(type)).flatMap((resource) => {
    if (!isRecord(resource) || !isRecord(resource.Properties)) {
      return [];
    }

    return [resource.Properties];
  });
}

function workloadRegionStack(
  props: {
    securityAgent?: boolean;
    devopsAgent?: boolean;
    cloudWatchOmniAdminRoleArn?: string;
  } = {},
): WorkloadRegionAccountSetupStack {
  const app = createAccountSetupApp();
  return new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
    env: {
      account: ACCOUNT_ID,
      region: WORKLOAD_REGION,
    },
    cloudWatchOmniAdminRoleArn:
      props.cloudWatchOmniAdminRoleArn ?? 'arn:aws:iam::123456789012:role/CloudWatchOmniAdminRole',

    ...props,
  });
}

function roleLogicalId(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value['Fn::GetAtt'])) {
    return undefined;
  }

  const [logicalId, attribute] = value['Fn::GetAtt'];
  if (typeof logicalId !== 'string' || attribute !== 'Arn') {
    return undefined;
  }

  return logicalId;
}

function iamRolesByLogicalId(template: Template): Map<string, Record<string, unknown>> {
  const roles = new Map<string, Record<string, unknown>>();

  for (const [logicalId, resource] of Object.entries(template.findResources('AWS::IAM::Role'))) {
    if (isRecord(resource) && isRecord(resource.Properties)) {
      roles.set(logicalId, resource.Properties);
    }
  }

  return roles;
}

function expectAccountLogRetentionPolicyDeferred(template: Template) {
  template.resourceCountIs('Custom::AWS', 0);
  expect(JSON.stringify(template.toJSON())).not.toContain('putAccountPolicy');
}

describe('resolveAccountSetupEnv', () => {
  it('uses AWS account and region from environment variables', () => {
    expect(
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        AWS_REGION: 'us-east-2',
        CLOUDWATCH_OMNI_ADMIN_ROLE: OMNI_ADMIN_ROLE_NAME,
      }),
    ).toEqual({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: 'us-east-2',
      CLOUDWATCH_OMNI_ADMIN_ROLE_ARN: OMNI_ADMIN_ROLE_ARN,
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
        CLOUDWATCH_OMNI_ADMIN_ROLE: OMNI_ADMIN_ROLE_NAME,
      }),
    ).toEqual({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: 'us-east-2',
      CLOUDWATCH_OMNI_ADMIN_ROLE_ARN: OMNI_ADMIN_ROLE_ARN,
    });
  });

  it('falls back to AWS_DEFAULT_REGION when AWS_REGION is missing', () => {
    expect(
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        AWS_DEFAULT_REGION: 'us-east-2',
        CLOUDWATCH_OMNI_ADMIN_ROLE: OMNI_ADMIN_ROLE_NAME,
      }),
    ).toEqual({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: 'us-east-2',
      CLOUDWATCH_OMNI_ADMIN_ROLE_ARN: OMNI_ADMIN_ROLE_ARN,
    });
  });

  it('throws when AWS_REGION is missing', () => {
    expect(
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        CLOUDWATCH_OMNI_ADMIN_ROLE: OMNI_ADMIN_ROLE_NAME,
      }),
    ).toEqual({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: undefined,
      CLOUDWATCH_OMNI_ADMIN_ROLE_ARN: OMNI_ADMIN_ROLE_ARN,
    });
  });

  it('grants the AWSReservedSSO role named by CLOUDWATCH_OMNI_ADMIN_ROLE', () => {
    expect(
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        CLOUDWATCH_OMNI_ADMIN_ROLE: 'AWSReservedSSO_AdministratorAccess_example',
      }).CLOUDWATCH_OMNI_ADMIN_ROLE_ARN,
    ).toBe(
      'arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess_example',
    );
  });

  it('keeps a full IAM role ARN in CLOUDWATCH_OMNI_ADMIN_ROLE', () => {
    const roleArn = 'arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/ExampleRole';
    expect(
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        CLOUDWATCH_OMNI_ADMIN_ROLE: roleArn,
      }).CLOUDWATCH_OMNI_ADMIN_ROLE_ARN,
    ).toBe(roleArn);
  });

  it('throws when CLOUDWATCH_OMNI_ADMIN_ROLE is missing', () => {
    expect(() =>
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        AWS_REGION: 'us-east-2',
      }),
    ).toThrow('Missing required environment variable: CLOUDWATCH_OMNI_ADMIN_ROLE');
  });

  it('throws when CLOUDWATCH_OMNI_ADMIN_ROLE is neither a role ARN nor an SSO role name', () => {
    expect(() =>
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        CLOUDWATCH_OMNI_ADMIN_ROLE: 'not-a-role',
      }),
    ).toThrow('CLOUDWATCH_OMNI_ADMIN_ROLE must be an IAM role ARN or an AWSReservedSSO role name');
  });

  it('throws when AWS_ACCOUNT_ID is not a 12-digit account id', () => {
    expect(() =>
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '12345',
        AWS_REGION: 'us-east-2',
        CLOUDWATCH_OMNI_ADMIN_ROLE: OMNI_ADMIN_ROLE_NAME,
      }),
    ).toThrow('AWS_ACCOUNT_ID must be a 12-digit AWS account ID');
  });

  it('throws when AWS_REGION does not look like an AWS region', () => {
    expect(() =>
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
        AWS_REGION: 'invalid-region',
        CLOUDWATCH_OMNI_ADMIN_ROLE: OMNI_ADMIN_ROLE_NAME,
      }),
    ).toThrow('AWS_REGION must look like an AWS region, for example us-east-2');
  });
});

describe('AccountSetupStack', () => {
  it('creates GitHub OIDC deployment resources for this repository only', () => {
    const app = createAccountSetupApp();
    const stack = new AccountSetupStack(app, 'AccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::VPC', 0);
    template.resourceCountIs('AWS::RDS::DBCluster', 0);
    template.resourceCountIs('AWS::RDS::DBInstance', 0);

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
    expect(snapshotSafeTemplate(templateJson)).toMatchSnapshot();
  });

  it('defers the account-level log retention policy until CloudFormation supports it', () => {
    const app = createAccountSetupApp();
    const stack = new AccountSetupStack(app, 'AccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    expectAccountLogRetentionPolicyDeferred(Template.fromStack(stack));
  });

  it('does not create agent spaces', () => {
    const app = createAccountSetupApp();
    const stack = new AccountSetupStack(app, 'AccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SecurityAgent::AgentSpace', 0);
    template.resourceCountIs('AWS::DevOpsAgent::AgentSpace', 0);
    template.resourceCountIs('AWS::DevOpsAgent::Association', 0);
  });

  it('does not create a CloudWatch Omni domain, space, or space operator role', () => {
    const app = createAccountSetupApp();
    const stack = new AccountSetupStack(app, 'AccountSetupStack', {
      env: {
        account: ACCOUNT_ID,
        region: 'us-east-1',
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudWatch::Domain', 0);
    template.resourceCountIs('AWS::CloudWatch::Space', 0);
    template.resourceCountIs('AWS::ObservabilityAdmin::DatasetIntegration', 0);
    const templateJson = JSON.stringify(template.toJSON());
    expect(templateJson).not.toContain('CloudWatchOmniSpaceAccessPolicy');
    expect(templateJson).not.toContain('CloudWatchOmniAWSIntegrationPolicyV2');
    expect(templateJson).not.toContain('cloudwatch.amazonaws.com');
  });
});

describe('WorkloadRegionAccountSetupStack', () => {
  it('creates shared Aurora PostgreSQL Serverless v2 infrastructure with Data API enabled', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
      cloudWatchOmniAdminRoleArn: 'arn:aws:iam::123456789012:role/CloudWatchOmniAdminRole',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      EnableHttpEndpoint: true,
      DeletionProtection: true,
      BackupRetentionPeriod: 7,
      ServerlessV2ScalingConfiguration: {
        MinCapacity: 0.5,
        MaxCapacity: 4,
      },
      DatabaseName: 'tanstackaws',
    });
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.serverless',
      Engine: 'aurora-postgresql',
    });
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/tanstack-aws/shared/aurora/cluster-arn',
      Type: 'String',
    });
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/tanstack-aws/shared/aurora/secret-arn',
      Type: 'String',
    });
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/tanstack-aws/shared/aurora/database-name',
      Type: 'String',
      Value: 'tanstackaws',
    });

    const clusterSgEntry = Object.entries(template.findResources('AWS::EC2::SecurityGroup')).find(
      ([, r]) =>
        (r as { Properties?: { GroupDescription?: string } }).Properties?.GroupDescription ===
        'Aurora cluster - Data API only, no direct connections',
    );
    expect(clusterSgEntry).toBeDefined();
    expect(
      (clusterSgEntry![1] as { Properties?: { SecurityGroupIngress?: unknown } }).Properties
        ?.SecurityGroupIngress,
    ).toBeUndefined();

    const templateJson = template.toJSON();
    expect(templateJson.Outputs).toHaveProperty('SharedAuroraClusterArn');
    expect(templateJson.Outputs).toHaveProperty('SharedAuroraSecretArn');
    expect(templateJson.Outputs).toHaveProperty('SharedAuroraDatabaseName');
    expect(snapshotSafeTemplate(templateJson)).toMatchSnapshot();
  });

  it('defers the account-level log retention policy until CloudFormation supports it', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
      cloudWatchOmniAdminRoleArn: 'arn:aws:iam::123456789012:role/CloudWatchOmniAdminRole',
    });

    expectAccountLogRetentionPolicyDeferred(Template.fromStack(stack));
  });

  it('creates a Security Agent application and a space named tanstack-aws-security', () => {
    const template = Template.fromStack(workloadRegionStack());
    template.resourceCountIs('AWS::SecurityAgent::AgentSpace', 1);
    template.hasResource('AWS::SecurityAgent::AgentSpace', {
      Properties: {
        Name: 'tanstack-aws-security',
        AwsResources: Match.absent(),
        CodeReviewSettings: Match.absent(),
        IntegratedResources: Match.absent(),
        KmsKeyId: Match.absent(),
        TargetDomainIds: Match.absent(),
      },
    });

    template.resourceCountIs('AWS::SecurityAgent::Application', 1);
    const [applicationLogicalId, application] = Object.entries(
      template.findResources('AWS::SecurityAgent::Application'),
    )[0] ?? ['', undefined];
    expect(isRecord(application) ? application.Properties : undefined).toEqual({
      RoleArn: { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
    });
    const applicationProperties = isRecord(application) ? application.Properties : undefined;
    const applicationRoleLogicalId = roleLogicalId(
      isRecord(applicationProperties) ? applicationProperties.RoleArn : undefined,
    );
    const applicationRole = iamRolesByLogicalId(template).get(applicationRoleLogicalId ?? '');
    expect(applicationRole?.AssumeRolePolicyDocument).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowServiceAssumeRole',
          Effect: 'Allow',
          Action: 'sts:AssumeRole',
          Principal: { Service: 'securityagent.amazonaws.com' },
          Condition: {
            StringEquals: { 'aws:SourceAccount': ACCOUNT_ID },
            ArnLike: {
              'aws:SourceArn': [
                `arn:aws:securityagent:${WORKLOAD_REGION}:${ACCOUNT_ID}:application/*`,
                `arn:aws:securityagent:${WORKLOAD_REGION}:${ACCOUNT_ID}:agent-space/*`,
              ],
            },
          },
        },
        {
          Sid: 'AllowServiceSetContext',
          Effect: 'Allow',
          Action: 'sts:SetContext',
          Principal: { Service: 'securityagent.amazonaws.com' },
          Condition: {
            StringEquals: { 'aws:SourceAccount': ACCOUNT_ID },
            'ForAllValues:ArnEquals': {
              'sts:RequestContextProviders': 'arn:aws:iam::aws:contextProvider/IdentityCenter',
            },
            ArnLike: {
              'aws:SourceArn': [
                `arn:aws:securityagent:${WORKLOAD_REGION}:${ACCOUNT_ID}:application/*`,
                `arn:aws:securityagent:${WORKLOAD_REGION}:${ACCOUNT_ID}:agent-space/*`,
              ],
            },
          },
        },
      ],
    });
    expect(applicationRole?.ManagedPolicyArns).toEqual([
      {
        'Fn::Join': [
          '',
          [
            'arn:',
            { Ref: 'AWS::Partition' },
            ':iam::aws:policy/service-role/AWSSecurityAgentWebAppPolicy',
          ],
        ],
      },
    ]);

    const applicationPolicy = Object.values(template.findResources('AWS::IAM::Policy')).find(
      (resource) => {
        if (!isRecord(resource) || !isRecord(resource.Properties)) {
          return false;
        }
        const roles = resource.Properties.Roles;
        return (
          Array.isArray(roles) &&
          roles.some((role) => isRecord(role) && role.Ref === applicationRoleLogicalId)
        );
      },
    );
    expect(isRecord(applicationPolicy) ? applicationPolicy.Properties : undefined).toMatchObject({
      PolicyDocument: {
        Statement: [
          {
            Sid: 'CloudWatchLogsRead',
            Effect: 'Allow',
            Action: 'logs:GetLogEvents',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  { Ref: 'AWS::Partition' },
                  `:logs:${WORKLOAD_REGION}:`,
                  { Ref: 'AWS::AccountId' },
                  ':log-group:*:log-stream:*',
                ],
              ],
            },
          },
          {
            Sid: 'SecretsManagerCreate',
            Effect: 'Allow',
            Action: 'secretsmanager:CreateSecret',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  { Ref: 'AWS::Partition' },
                  `:secretsmanager:${WORKLOAD_REGION}:`,
                  { Ref: 'AWS::AccountId' },
                  ':secret:*',
                ],
              ],
            },
          },
        ],
      },
    });

    const applicationResource = template.toJSON().Resources[applicationLogicalId];
    const dependsOn = isRecord(applicationResource) ? applicationResource.DependsOn : undefined;
    expect(dependsOn).toEqual(expect.arrayContaining([expect.stringMatching(/DefaultPolicy/)]));
  });

  it('omits the Security Agent space when securityAgent is false', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
      securityAgent: false,
      cloudWatchOmniAdminRoleArn: 'arn:aws:iam::123456789012:role/CloudWatchOmniAdminRole',
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SecurityAgent::AgentSpace', 0);
    template.resourceCountIs('AWS::SecurityAgent::Application', 0);
    template.resourceCountIs('AWS::DevOpsAgent::AgentSpace', 1);
    template.resourceCountIs('AWS::DevOpsAgent::Association', 1);
    expect(iamRolesByLogicalId(template).size).toBe(
      iamRolesByLogicalId(Template.fromStack(workloadRegionStack())).size - 1,
    );
    expect(JSON.stringify(template.toJSON())).not.toContain('securityagent.amazonaws.com');
    expect(JSON.stringify(template.toJSON())).not.toContain('AWSSecurityAgentWebAppPolicy');
    expectSharedWorkloadResources(template);
  });

  it('omits the DevOps Agent space, association, and roles when devopsAgent is false', () => {
    const template = Template.fromStack(workloadRegionStack({ devopsAgent: false }));
    const defaultRoles = iamRolesByLogicalId(Template.fromStack(workloadRegionStack()));

    template.resourceCountIs('AWS::DevOpsAgent::AgentSpace', 0);
    template.resourceCountIs('AWS::DevOpsAgent::Association', 0);
    template.resourceCountIs('AWS::SecurityAgent::AgentSpace', 1);
    template.resourceCountIs('AWS::SecurityAgent::Application', 1);
    template.hasResourceProperties('AWS::SecurityAgent::AgentSpace', {
      Name: 'tanstack-aws-security',
    });

    const roles = iamRolesByLogicalId(template);
    expect(roles.size).toBe(defaultRoles.size - 2);
    for (const role of roles.values()) {
      const document = JSON.stringify(role.AssumeRolePolicyDocument);
      expect(document).not.toContain('aidevops.amazonaws.com');
      expect(document).not.toContain(':root');
    }
    expect(JSON.stringify(template.toJSON())).not.toContain('AIDevOpsAgentAccessPolicy');
    expect(JSON.stringify(template.toJSON())).not.toContain('AIDevOpsOperatorAppAccessPolicy');
    expectSharedWorkloadResources(template);
  });

  it('creates a DevOps Agent space with IAM operator sign-in and a monitor association', () => {
    const template = Template.fromStack(workloadRegionStack());

    template.resourceCountIs('AWS::DevOpsAgent::AgentSpace', 1);
    template.hasResource('AWS::DevOpsAgent::AgentSpace', {
      Properties: {
        Name: 'tanstack-aws-devops',
        OperatorApp: {
          Iam: {
            OperatorAppRoleArn: Match.anyValue(),
          },
          Idc: Match.absent(),
          Idp: Match.absent(),
        },
        KmsKeyArn: Match.absent(),
      },
    });

    template.resourceCountIs('AWS::DevOpsAgent::Association', 1);
    const [association] = resourceProperties(template, 'AWS::DevOpsAgent::Association');
    expect(association?.ServiceId).toBe('aws');
    expect(association?.Configuration).toEqual({
      Aws: {
        AccountId: ACCOUNT_ID,
        AccountType: 'monitor',
        AssumableRoleArn: expect.any(Object),
      },
    });

    const [agentSpaceLogicalId] = Object.keys(
      template.findResources('AWS::DevOpsAgent::AgentSpace'),
    );
    const roles = iamRolesByLogicalId(template);
    const configuration = isRecord(association?.Configuration)
      ? association.Configuration
      : undefined;
    const awsConfiguration = isRecord(configuration?.Aws) ? configuration.Aws : undefined;
    const assumableRole = roles.get(roleLogicalId(awsConfiguration?.AssumableRoleArn) ?? '');
    expect(assumableRole?.AssumeRolePolicyDocument).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 'sts:AssumeRole',
          Principal: {
            Service: 'aidevops.amazonaws.com',
          },
          Condition: {
            StringEquals: {
              'aws:SourceAccount': ACCOUNT_ID,
            },
            ArnEquals: {
              'aws:SourceArn': { 'Fn::GetAtt': [agentSpaceLogicalId, 'Arn'] },
            },
          },
        },
      ],
    });
    expect(assumableRole?.ManagedPolicyArns).toEqual([
      {
        'Fn::Join': [
          '',
          ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/AIDevOpsAgentAccessPolicy'],
        ],
      },
    ]);
    expect(assumableRole).not.toHaveProperty('Policies');

    const [agentSpace] = resourceProperties(template, 'AWS::DevOpsAgent::AgentSpace');
    const operatorApp = isRecord(agentSpace?.OperatorApp) ? agentSpace.OperatorApp : undefined;
    const iamSignIn = isRecord(operatorApp?.Iam) ? operatorApp.Iam : undefined;
    const operatorRole = roles.get(roleLogicalId(iamSignIn?.OperatorAppRoleArn) ?? '');
    expect(operatorRole?.AssumeRolePolicyDocument).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['sts:AssumeRole', 'sts:TagSession'],
          Principal: {
            Service: 'aidevops.amazonaws.com',
          },
          Condition: {
            StringEquals: {
              'aws:SourceAccount': ACCOUNT_ID,
            },
            ArnLike: {
              'aws:SourceArn': `arn:aws:aidevops:${WORKLOAD_REGION}:${ACCOUNT_ID}:agentspace/*`,
            },
          },
        },
      ],
    });
    expect(operatorRole?.ManagedPolicyArns).toEqual([
      {
        'Fn::Join': [
          '',
          ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/AIDevOpsOperatorAppAccessPolicy'],
        ],
      },
    ]);
  });

  it('creates a CloudWatch Omni domain named tanstack-aws with IAM as the only sign-in method', () => {
    const template = Template.fromStack(workloadRegionStack());
    template.resourceCountIs('AWS::CloudWatch::Domain', 1);
    template.hasResourceProperties('AWS::CloudWatch::Domain', {
      Name: 'tanstack-aws',
      IdentityProviders: ['IAM'],
    });

    const [domain] = resourceProperties(template, 'AWS::CloudWatch::Domain');
    expect(domain?.IdentityProviderConfiguration).toBeUndefined();
  });

  it('creates a CloudWatch Omni space named tanstack-aws in that domain without evaluation or a customer-managed key', () => {
    const template = Template.fromStack(workloadRegionStack());
    const [domainLogicalId] = Object.keys(template.findResources('AWS::CloudWatch::Domain'));
    template.resourceCountIs('AWS::CloudWatch::Space', 1);
    template.hasResourceProperties('AWS::CloudWatch::Space', {
      Name: 'tanstack-aws',
      DomainId: { 'Fn::GetAtt': [domainLogicalId, 'DomainId'] },
    });

    const [space] = resourceProperties(template, 'AWS::CloudWatch::Space');
    expect(space?.AgentCoreEvaluationRoleArn).toBeUndefined();
    expect(space?.EncryptionConfiguration).toBeUndefined();
    expect(space?.DataAccessRoleArn).toBeDefined();
    template.resourceCountIs('AWS::CloudWatch::AccessGrant', 1);
  });

  it('creates an account KMS key and an envs secret whose value is not managed by CloudFormation', () => {
    const template = Template.fromStack(workloadRegionStack());
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
      Description: 'Account key for this workload region.',
    });
    const [keyLogicalId] = Object.keys(template.findResources('AWS::KMS::Key'));
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/account',
      TargetKeyId: { 'Fn::GetAtt': [keyLogicalId, 'Arn'] },
    });
    template.hasResource('AWS::SecretsManager::Secret', {
      Properties: {
        Name: 'envs',
        Description: 'Account environment values. JSON object keyed by variable name.',
        KmsKeyId: { 'Fn::GetAtt': [keyLogicalId, 'Arn'] },
        SecretString: Match.absent(),
        GenerateSecretString: {
          SecretStringTemplate: '{}',
          GenerateStringKey: 'initial',
        },
      },
    });
  });

  it('grants SPACE_ADMIN to the CloudWatch Omni admin role', () => {
    const adminRoleArn =
      'arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess_example';
    const template = Template.fromStack(
      workloadRegionStack({ cloudWatchOmniAdminRoleArn: adminRoleArn }),
    );
    const [domainLogicalId] = Object.keys(template.findResources('AWS::CloudWatch::Domain'));
    const [spaceLogicalId] = Object.keys(template.findResources('AWS::CloudWatch::Space'));
    template.resourceCountIs('AWS::CloudWatch::AccessGrant', 1);
    template.hasResourceProperties('AWS::CloudWatch::AccessGrant', {
      Name: 'additional-admin',
      Permission: 'SPACE_ADMIN',
      DomainId: { 'Fn::GetAtt': [domainLogicalId, 'DomainId'] },
      SpaceId: { 'Fn::GetAtt': [spaceLogicalId, 'SpaceId'] },
      Principal: {
        PrincipalType: 'IAM_ROLE',
        PrincipalId: adminRoleArn,
      },
    });
  });

  it('makes the space data-access role the space operator role for this account only', () => {
    const template = Template.fromStack(workloadRegionStack());
    const [space] = resourceProperties(template, 'AWS::CloudWatch::Space');
    const dataAccessRoleId = roleLogicalId(space?.DataAccessRoleArn);
    if (!dataAccessRoleId) {
      throw new Error('Space DataAccessRoleArn does not reference an IAM role in this template');
    }
    const role = iamRolesByLogicalId(template).get(dataAccessRoleId);
    expect(role).toBeDefined();

    const statements = assumeRoleStatements(role?.AssumeRolePolicyDocument);
    const cloudWatchStatements = statements.filter((statement) =>
      trustsService(statement, 'cloudwatch.amazonaws.com'),
    );
    expect(cloudWatchStatements.length).toBeGreaterThan(0);
    for (const statement of cloudWatchStatements) {
      expect(statement.Condition).toEqual({
        StringEquals: { 'aws:SourceAccount': ACCOUNT_ID },
      });
    }
    expect(
      cloudWatchStatements.flatMap((statement) => statementActions(statement.Action)).sort(),
    ).toEqual(
      ['sts:AssumeRole', 'sts:SetContext', 'sts:SetSourceIdentity', 'sts:TagSession'].sort(),
    );

    expect(role?.ManagedPolicyArns).toEqual([
      {
        'Fn::Join': [
          '',
          ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/CloudWatchOmniSpaceAccessPolicy'],
        ],
      },
      {
        'Fn::Join': [
          '',
          [
            'arn:',
            { Ref: 'AWS::Partition' },
            ':iam::aws:policy/CloudWatchOmniAWSIntegrationPolicyV2',
          ],
        ],
      },
    ]);
    expect(JSON.stringify(template.toJSON())).not.toContain('CloudWatchOmniModelInferencePolicy');

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'cloudwatch:GetSpaceDataAccess',
            Resource: `arn:aws:cloudwatch:${WORKLOAD_REGION}:${ACCOUNT_ID}:space/*`,
          }),
        ]),
      },
      Roles: [{ Ref: dataAccessRoleId }],
    });
  });

  it('forwards logs and traces into the CloudWatch Dataset and leaves OTel enrichment and span ingestion off', () => {
    const template = Template.fromStack(workloadRegionStack());
    template.resourceCountIs('AWS::ObservabilityAdmin::DatasetIntegration', 1);
    template.resourceCountIs('AWS::CloudWatch::OTelEnrichment', 0);
    template.resourceCountIs('AWS::XRay::TransactionSearchConfig', 0);

    const [integration] = resourceProperties(
      template,
      'AWS::ObservabilityAdmin::DatasetIntegration',
    );
    const integrationRoleId = roleLogicalId(integration?.RoleArn);
    if (!integrationRoleId) {
      throw new Error(
        'Dataset integration RoleArn does not reference an IAM role in this template',
      );
    }
    const role = iamRolesByLogicalId(template).get(integrationRoleId);
    const statements = assumeRoleStatements(role?.AssumeRolePolicyDocument);
    const logsStatements = statements.filter((statement) =>
      trustsService(statement, 'logs.amazonaws.com'),
    );
    expect(logsStatements).toEqual([
      expect.objectContaining({
        Effect: 'Allow',
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: { 'aws:SourceAccount': ACCOUNT_ID },
          ArnLike: {
            'aws:SourceArn': `arn:aws:observabilityadmin:${WORKLOAD_REGION}:${ACCOUNT_ID}:dataset-integration/default`,
          },
        },
      }),
    ]);

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'logs:IntegrateWithDataset',
            Resource: `arn:aws:logs:${WORKLOAD_REGION}:${ACCOUNT_ID}:log-group:*`,
          }),
          Match.objectLike({
            Effect: 'Allow',
            Action: 'cloudwatch:PutRecords',
            Resource: '*',
          }),
        ]),
      },
      Roles: [{ Ref: integrationRoleId }],
    });
  });
});

function expectSharedWorkloadResources(template: Template) {
  expectAccountLogRetentionPolicyDeferred(template);
  template.resourceCountIs('AWS::CloudWatch::Domain', 1);
  template.hasResourceProperties('AWS::CloudWatch::Domain', {
    Name: 'tanstack-aws',
  });
  template.resourceCountIs('AWS::CloudWatch::Space', 1);
  template.hasResourceProperties('AWS::CloudWatch::Space', {
    Name: 'tanstack-aws',
  });
  template.resourceCountIs('AWS::RDS::DBCluster', 1);
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    Engine: 'aurora-postgresql',
    DatabaseName: 'tanstackaws',
  });
}

function assumeRoleStatements(policyDocument: unknown): Array<{
  Action?: unknown;
  Condition?: unknown;
  Principal?: unknown;
}> {
  if (!isRecord(policyDocument) || !Array.isArray(policyDocument.Statement)) {
    return [];
  }

  return policyDocument.Statement.flatMap((statement) => {
    if (!isRecord(statement)) {
      return [];
    }
    return [statement];
  });
}

function trustsService(statement: { Principal?: unknown }, service: string): boolean {
  const principal = statement.Principal;
  if (!isRecord(principal) || !('Service' in principal)) {
    return false;
  }
  const servicePrincipal = principal.Service;
  return (
    servicePrincipal === service ||
    (Array.isArray(servicePrincipal) && servicePrincipal.includes(service))
  );
}

function statementActions(action: unknown): string[] {
  if (typeof action === 'string') {
    return [action];
  }
  if (Array.isArray(action) && action.every((item) => typeof item === 'string')) {
    return action;
  }
  return [];
}
