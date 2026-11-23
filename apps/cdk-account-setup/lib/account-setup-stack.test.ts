import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../../../tooling/cdk-snapshot.ts';
import { AccountSetupStack } from './account-setup-stack.ts';
import { githubActionsOidcConfig, resolveAccountSetupEnv } from './app-config.ts';
import { createAccountSetupApp } from './cdk-app.ts';
import { WorkloadRegionAccountSetupStack } from './workload-region-account-setup-stack.ts';

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

  it('does not create a CloudWatch Omni domain, space, or space operator role', () => {
    const app = createAccountSetupApp();
    const stack = new AccountSetupStack(app, 'AccountSetupStack', {
      env: {
        account: '123456789012',
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

  it('creates a CloudWatch Omni domain named tanstack-aws with IAM as the only sign-in method', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudWatch::Domain', 1);
    template.hasResourceProperties('AWS::CloudWatch::Domain', {
      Name: 'tanstack-aws',
      IdentityProviders: ['IAM'],
    });

    const [domain] = Object.values(template.findResources('AWS::CloudWatch::Domain'));
    expect(domain?.Properties?.IdentityProviderConfiguration).toBeUndefined();
  });

  it('creates a CloudWatch Omni space named tanstack-aws in that domain without evaluation or a customer-managed key', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
    });

    const template = Template.fromStack(stack);
    const [domainLogicalId] = Object.keys(template.findResources('AWS::CloudWatch::Domain'));
    template.resourceCountIs('AWS::CloudWatch::Space', 1);
    template.hasResourceProperties('AWS::CloudWatch::Space', {
      Name: 'tanstack-aws',
      DomainId: { 'Fn::GetAtt': [domainLogicalId, 'DomainId'] },
    });

    const [space] = Object.values(template.findResources('AWS::CloudWatch::Space'));
    expect(space?.Properties?.AgentCoreEvaluationRoleArn).toBeUndefined();
    expect(space?.Properties?.EncryptionConfiguration).toBeUndefined();
    expect(space?.Properties?.DataAccessRoleArn).toBeDefined();
  });

  it('makes the space data-access role the space operator role for this account only', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
    });

    const template = Template.fromStack(stack);
    const [space] = Object.values(template.findResources('AWS::CloudWatch::Space'));
    const dataAccessRoleArn = space?.Properties?.DataAccessRoleArn;
    const roleLogicalId = roleLogicalIdFromArn(dataAccessRoleArn);
    const role = template.findResources('AWS::IAM::Role')[roleLogicalId];
    expect(role).toBeDefined();

    const statements = assumeRoleStatements(role?.Properties?.AssumeRolePolicyDocument);
    const cloudWatchStatements = statements.filter((statement) =>
      trustsService(statement, 'cloudwatch.amazonaws.com'),
    );
    expect(cloudWatchStatements.length).toBeGreaterThan(0);
    for (const statement of cloudWatchStatements) {
      expect(statement.Condition).toEqual({
        StringEquals: { 'aws:SourceAccount': '123456789012' },
      });
    }
    expect(
      cloudWatchStatements.flatMap((statement) => statementActions(statement.Action)).sort(),
    ).toEqual(
      ['sts:AssumeRole', 'sts:SetContext', 'sts:SetSourceIdentity', 'sts:TagSession'].sort(),
    );

    expect(role?.Properties?.ManagedPolicyArns).toEqual([
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
  });

  it('forwards logs and traces into the CloudWatch Dataset and leaves OTel enrichment and span ingestion off', () => {
    const app = createAccountSetupApp();
    const stack = new WorkloadRegionAccountSetupStack(app, 'WorkloadRegionAccountSetupStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ObservabilityAdmin::DatasetIntegration', 1);
    template.resourceCountIs('AWS::CloudWatch::OTelEnrichment', 0);
    template.resourceCountIs('AWS::XRay::TransactionSearchConfig', 0);

    const [integration] = Object.values(
      template.findResources('AWS::ObservabilityAdmin::DatasetIntegration'),
    );
    const roleLogicalId = roleLogicalIdFromArn(integration?.Properties?.RoleArn);
    const role = template.findResources('AWS::IAM::Role')[roleLogicalId];
    const statements = assumeRoleStatements(role?.Properties?.AssumeRolePolicyDocument);
    const logsStatements = statements.filter((statement) =>
      trustsService(statement, 'logs.amazonaws.com'),
    );
    expect(logsStatements).toEqual([
      expect.objectContaining({
        Effect: 'Allow',
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: { 'aws:SourceAccount': '123456789012' },
          ArnLike: {
            'aws:SourceArn':
              'arn:aws:observabilityadmin:us-east-2:123456789012:dataset-integration/default',
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
            Resource: 'arn:aws:logs:us-east-2:123456789012:log-group:*',
          }),
          Match.objectLike({
            Effect: 'Allow',
            Action: 'cloudwatch:PutRecords',
            Resource: '*',
          }),
        ]),
      },
      Roles: [{ Ref: roleLogicalId }],
    });
  });
});

function roleLogicalIdFromArn(roleArn: unknown): string {
  if (
    typeof roleArn === 'object' &&
    roleArn !== null &&
    'Fn::GetAtt' in roleArn &&
    Array.isArray(roleArn['Fn::GetAtt']) &&
    typeof roleArn['Fn::GetAtt'][0] === 'string'
  ) {
    return roleArn['Fn::GetAtt'][0];
  }

  throw new Error('Space DataAccessRoleArn does not reference an IAM role in this template');
}

function assumeRoleStatements(policyDocument: unknown): Array<{
  Action?: unknown;
  Condition?: unknown;
  Principal?: unknown;
}> {
  if (
    typeof policyDocument !== 'object' ||
    policyDocument === null ||
    !('Statement' in policyDocument) ||
    !Array.isArray(policyDocument.Statement)
  ) {
    return [];
  }

  return policyDocument.Statement.flatMap((statement) => {
    if (typeof statement !== 'object' || statement === null) {
      return [];
    }
    return [statement];
  });
}

function trustsService(statement: { Principal?: unknown }, service: string): boolean {
  const principal = statement.Principal;
  if (typeof principal !== 'object' || principal === null || !('Service' in principal)) {
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
