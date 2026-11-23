import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../../../tooling/cdk-snapshot.ts';
import { AccountSetupStack } from './account-setup-stack.ts';
import { githubActionsOidcConfig, resolveAccountSetupEnv } from './app-config.ts';
import { createAccountSetupApp } from './cdk-app.ts';
import { WorkloadRegionAccountSetupStack } from './workload-region-account-setup-stack.ts';

const ACCOUNT_ID = '123456789012';
const WORKLOAD_REGION = 'us-east-2';
const DEVOPS_AGENT_SOURCE_ARN = `arn:aws:aidevops:${WORKLOAD_REGION}:${ACCOUNT_ID}:agentspace/*`;
const ACCOUNT_LOG_RETENTION_POLICY_NAME = 'account-log-retention';
const ACCOUNT_LOG_RETENTION_POLICY_DOCUMENT =
  '{"retentionInDays":30,"enforcementMode":"RETROACTIVE"}';

type AccountPolicySdkCall = {
  service: string;
  action: string;
  parameters: Record<string, unknown>;
};

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
  props: { securityAgent?: boolean; devopsAgent?: boolean } = {},
): WorkloadRegionAccountSetupStack {
  const app = createAccountSetupApp();
  return new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
    env: {
      account: ACCOUNT_ID,
      region: WORKLOAD_REGION,
    },
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

function readAccountPolicySdkCall(value: unknown): AccountPolicySdkCall | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) {
    return undefined;
  }

  const { service, action, parameters } = parsed;
  if (typeof service !== 'string' || typeof action !== 'string' || !isRecord(parameters)) {
    return undefined;
  }

  return { service, action, parameters };
}

function accountPolicySdkCalls(template: Template): AccountPolicySdkCall[] {
  const calls: AccountPolicySdkCall[] = [];

  for (const resource of Object.values(template.findResources('Custom::AWS'))) {
    if (!isRecord(resource) || !isRecord(resource.Properties)) {
      continue;
    }

    for (const eventName of ['Create', 'Update', 'Delete']) {
      const call = readAccountPolicySdkCall(resource.Properties[eventName]);
      if (call) {
        calls.push(call);
      }
    }
  }

  return calls;
}

function expectAccountLogRetentionPolicy(template: Template) {
  template.resourceCountIs('Custom::AWS', 1);

  const calls = accountPolicySdkCalls(template);
  const putCalls = calls.filter((call) => call.action === 'putAccountPolicy');
  const deleteCalls = calls.filter((call) => call.action === 'deleteAccountPolicy');

  expect(putCalls).toEqual([
    {
      service: 'CloudWatchLogs',
      action: 'putAccountPolicy',
      parameters: {
        policyName: ACCOUNT_LOG_RETENTION_POLICY_NAME,
        policyType: 'RETENTION_POLICY',
        policyDocument: ACCOUNT_LOG_RETENTION_POLICY_DOCUMENT,
      },
    },
    {
      service: 'CloudWatchLogs',
      action: 'putAccountPolicy',
      parameters: {
        policyName: ACCOUNT_LOG_RETENTION_POLICY_NAME,
        policyType: 'RETENTION_POLICY',
        policyDocument: ACCOUNT_LOG_RETENTION_POLICY_DOCUMENT,
      },
    },
  ]);
  expect(deleteCalls).toEqual([
    {
      service: 'CloudWatchLogs',
      action: 'deleteAccountPolicy',
      parameters: {
        policyName: ACCOUNT_LOG_RETENTION_POLICY_NAME,
        policyType: 'RETENTION_POLICY',
      },
    },
  ]);
  expect(JSON.stringify(calls)).not.toContain('selectionCriteria');
  expect(JSON.stringify(calls)).not.toContain('LogGroupNamePrefix');
}

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
    expect(
      resolveAccountSetupEnv({
        AWS_ACCOUNT_ID: '123456789012',
      }),
    ).toEqual({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: undefined,
    });
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

  it('sets an account-level log retention policy for every log group in us-east-1', () => {
    const app = createAccountSetupApp();
    const stack = new AccountSetupStack(app, 'AccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    expectAccountLogRetentionPolicy(Template.fromStack(stack));
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
});

describe('WorkloadRegionAccountSetupStack', () => {
  it('creates shared Aurora PostgreSQL Serverless v2 infrastructure with Data API enabled', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
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

  it('sets an account-level log retention policy for every log group in us-east-2', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
    });

    expectAccountLogRetentionPolicy(Template.fromStack(stack));
  });

  it('creates a Security Agent space named tanstack-aws-security and nothing else', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
    });

    const template = Template.fromStack(stack);
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
  });

  it('omits the Security Agent space when securityAgent is false', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
      securityAgent: false,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SecurityAgent::AgentSpace', 0);
    template.resourceCountIs('AWS::DevOpsAgent::AgentSpace', 1);
    template.resourceCountIs('AWS::DevOpsAgent::Association', 1);
    expect(iamRolesByLogicalId(template).size).toBe(
      iamRolesByLogicalId(Template.fromStack(workloadRegionStack())).size,
    );
  });

  it('omits the DevOps Agent space, association, and roles when devopsAgent is false', () => {
    const template = Template.fromStack(workloadRegionStack({ devopsAgent: false }));
    const defaultRoles = iamRolesByLogicalId(Template.fromStack(workloadRegionStack()));

    template.resourceCountIs('AWS::DevOpsAgent::AgentSpace', 0);
    template.resourceCountIs('AWS::DevOpsAgent::Association', 0);
    template.resourceCountIs('AWS::SecurityAgent::AgentSpace', 1);
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
            ArnLike: {
              'aws:SourceArn': DEVOPS_AGENT_SOURCE_ARN,
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
          Action: 'sts:AssumeRole',
          Principal: {
            AWS: `arn:aws:iam::${ACCOUNT_ID}:root`,
          },
        },
      ],
    });
  });
});
