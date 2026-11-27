import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, ServerlessChecks } from 'cdk-nag';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../../../../tooling/cdk-snapshot.ts';
import { cursorOidcConfig } from '../app-config.ts';
import { createAccountSetupApp } from '../cdk-app.ts';
import { GrokBotOpsReadOnlySetup } from './GrokBotOpsReadOnlySetup.ts';

const DENY_SECRET_AND_DATA_READS = [
  'secretsmanager:GetSecretValue',
  'secretsmanager:BatchGetSecretValue',
  'ssm:GetParameter*',
  'kms:Decrypt',
  'ec2:GetPasswordData',
  'ecr:GetAuthorizationToken',
  's3:GetObject',
  's3:GetObjectVersion',
  's3:GetObjectAttributes',
  's3:GetObjectVersionAttributes',
  's3:GetObjectTorrent',
  's3:SelectObjectContent',
  'dynamodb:GetItem',
  'dynamodb:BatchGetItem',
  'dynamodb:Query',
  'dynamodb:Scan',
  'dynamodb:PartiQLSelect',
  'dynamodb:ExecuteStatement',
  'dynamodb:ExecuteTransaction',
  'dynamodb:BatchExecuteStatement',
  'dynamodb:GetRecords',
  'dynamodb:GetShardIterator',
  'rds-data:ExecuteStatement',
  'rds-data:BatchExecuteStatement',
  'rds-data:ExecuteSql',
  'redshift-data:ExecuteStatement',
  'redshift-data:BatchExecuteStatement',
  'redshift-data:GetStatementResult',
  'lambda:GetFunction',
  'lambda:GetFunctionConfiguration',
  'lambda:GetLayerVersion',
];

const METADATA_READS_THAT_STAY_ALLOWED = [
  'secretsmanager:DescribeSecret',
  'secretsmanager:ListSecrets',
  'ssm:DescribeParameters',
  'logs:GetLogEvents',
  'logs:FilterLogEvents',
  'cloudformation:DescribeStacks',
  'cloudformation:DescribeStackDriftDetectionStatus',
  'cloudformation:DescribeStackResourceDrifts',
  'cloudformation:DetectStackDrift',
  'rds:DescribeDBClusters',
  'xray:GetTraceSummaries',
  'xray:BatchGetTraces',
  's3:ListBucket',
  'lambda:ListFunctions',
];

function setupStack(allowedSubject: string = cursorOidcConfig.allowedSubject): {
  stack: Stack;
  setup: GrokBotOpsReadOnlySetup;
} {
  const app = createAccountSetupApp();
  const stack = new Stack(app, 'Test');
  const setup = new GrokBotOpsReadOnlySetup(stack, 'GrokBotOpsReadOnlySetup', {
    config: {
      oidcUrl: cursorOidcConfig.oidcUrl,
      oidcAudience: cursorOidcConfig.oidcAudience,
      allowedSubject,
    },
  });
  return { stack, setup };
}

function roleViolations(report: ReturnType<AwsSolutionsChecks['validateScope']>): string[] {
  return report.violations
    .filter(
      (violation) =>
        violation.ruleName.includes('ReadOnlyAccess') ||
        violation.ruleName.includes('ce:') ||
        violation.ruleName.includes('cloudformation:'),
    )
    .map((violation) => violation.ruleName);
}

describe('GrokBotOpsReadOnlySetup', () => {
  it('trusts one Cursor subject and grants read-only monitoring without data-plane reads', () => {
    const { stack, setup } = setupStack();
    const template = Template.fromStack(stack);

    expect(setup.oidcProvider).toBeDefined();
    expect(setup.role).toBeDefined();

    template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
      Url: 'https://api.cursor.com',
      ClientIDList: ['sts.amazonaws.com'],
    });

    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'GrokBotOpsReadOnlyRole',
      Description:
        'Read-only operations monitoring for the Cursor Grok Bot ops assistant (user:155323293).',
      MaxSessionDuration: 3600,
      ManagedPolicyArns: [
        {
          'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/ReadOnlyAccess']],
        },
      ],
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRoleWithWebIdentity',
            Effect: 'Allow',
            Principal: {
              Federated: { Ref: Match.anyValue() },
            },
            Condition: {
              StringEquals: {
                'api.cursor.com:aud': 'sts.amazonaws.com',
                'api.cursor.com:sub': 'user:155323293',
              },
            },
          },
        ],
      },
    });

    const templateJson = template.toJSON();
    const resourcesJson = JSON.stringify(templateJson.Resources);
    expect(resourcesJson).not.toContain('StringLike');
    expect(resourcesJson).not.toContain('user:*');
    expect(resourcesJson).not.toContain('AdministratorAccess');

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Sid: 'CostExplorerRead',
            Effect: 'Allow',
            // minimizePolicies sorts actions.
            Action: ['ce:Describe*', 'ce:Get*', 'ce:List*'],
            Resource: '*',
          },
          {
            Sid: 'CloudFormationDriftDetection',
            Effect: 'Allow',
            Action: ['cloudformation:DetectStackDrift', 'cloudformation:DetectStackResourceDrift'],
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  { Ref: 'AWS::Partition' },
                  ':cloudformation:*:',
                  { Ref: 'AWS::AccountId' },
                  ':stack/*',
                ],
              ],
            },
          },
          {
            Sid: 'DenySecretAndDataPlaneReads',
            Effect: 'Deny',
            Action: [...DENY_SECRET_AND_DATA_READS].sort((left, right) =>
              left.localeCompare(right),
            ),
            Resource: '*',
          },
        ],
      },
    });

    const denied = new Set(DENY_SECRET_AND_DATA_READS);
    for (const action of METADATA_READS_THAT_STAY_ALLOWED) {
      expect(denied.has(action)).toBe(false);
    }

    expect(snapshotSafeTemplate(templateJson)).toMatchSnapshot();
  });

  it('uses the subject passed in the construct config', () => {
    const { stack } = setupStack('service_account:ops-bot');
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Condition: {
              StringEquals: {
                'api.cursor.com:aud': 'sts.amazonaws.com',
                'api.cursor.com:sub': 'service_account:ops-bot',
              },
            },
          }),
        ]),
      },
    });
  });

  it('rejects a wildcard subject', () => {
    expect(() => setupStack('user:*')).toThrow(
      'cursorOidcSubject must be an exact OIDC sub with no whitespace or wildcards. Received "user:*".',
    );
  });

  it('passes cdk-nag for the read-only role', () => {
    const { stack } = setupStack();
    Template.fromStack(stack);

    expect(roleViolations(new AwsSolutionsChecks().validateScope(stack))).toEqual([]);
    expect(roleViolations(new ServerlessChecks().validateScope(stack))).toEqual([]);
  });
});
