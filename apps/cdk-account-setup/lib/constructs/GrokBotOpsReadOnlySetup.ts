import { Aws, Duration, Validations } from 'aws-cdk-lib';
import {
  Effect,
  ManagedPolicy,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { type CursorOidcConfig, resolveCursorOidcSubject } from '../app-config.ts';

const ROLE_NAME = 'GrokBotOpsReadOnlyRole';
const READ_ONLY_ACCESS_POLICY = 'ReadOnlyAccess';
const MAX_SESSION = Duration.hours(1);

/**
 * Reads that return secret values, object bytes, item data, query results, or
 * function code and environment. `ReadOnlyAccess` still grants several of
 * these. Describe and list actions are intentionally absent so metadata,
 * CloudWatch, CloudFormation reads, RDS describe, and X-Ray keep working.
 */
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

const COST_EXPLORER_READ_ACTIONS = ['ce:Get*', 'ce:Describe*', 'ce:List*'];

type GrokBotOpsReadOnlySetupProps = {
  config: CursorOidcConfig;
};

/**
 * OIDC provider for https://api.cursor.com and a read-only role the Grok Bot
 * ops assistant assumes with AssumeRoleWithWebIdentity.
 */
export class GrokBotOpsReadOnlySetup extends Construct {
  public readonly oidcProvider: OpenIdConnectProvider;
  public readonly role: Role;

  constructor(scope: Construct, id: string, props: GrokBotOpsReadOnlySetupProps) {
    super(scope, id);

    const allowedSubject = resolveCursorOidcSubject({ prop: props.config.allowedSubject });
    const issuerHost = oidcIssuerHost(props.config.oidcUrl);

    this.oidcProvider = new OpenIdConnectProvider(this, 'Provider', {
      url: props.config.oidcUrl,
      clientIds: [props.config.oidcAudience],
    });

    this.role = new Role(this, 'Role', {
      roleName: ROLE_NAME,
      description: 'Read-only operations monitoring for the Cursor Grok Bot ops assistant.',
      maxSessionDuration: MAX_SESSION,
      assumedBy: new WebIdentityPrincipal(this.oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          [`${issuerHost}:aud`]: props.config.oidcAudience,
          [`${issuerHost}:sub`]: allowedSubject,
        },
      }),
    });

    this.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(READ_ONLY_ACCESS_POLICY));

    this.role.addToPolicy(
      new PolicyStatement({
        sid: 'CostExplorerRead',
        actions: COST_EXPLORER_READ_ACTIONS,
        resources: ['*'],
      }),
    );

    // DetectStack* starts a drift check and records status. It does not change
    // stack resources. ReadOnlyAccess includes the describe calls that read the
    // result, and not the call that starts the check.
    const stackArn = `arn:${Aws.PARTITION}:cloudformation:*:${Aws.ACCOUNT_ID}:stack/*`;
    this.role.addToPolicy(
      new PolicyStatement({
        sid: 'CloudFormationDriftDetection',
        actions: ['cloudformation:DetectStackDrift', 'cloudformation:DetectStackResourceDrift'],
        resources: [stackArn],
      }),
    );

    this.role.addToPolicy(
      new PolicyStatement({
        sid: 'DenySecretAndDataPlaneReads',
        effect: Effect.DENY,
        actions: DENY_SECRET_AND_DATA_READS,
        resources: ['*'],
      }),
    );

    // cdk-nag flattens Fn::Join ARNs before matching appliesTo.
    const readOnlyAccessFinding = `Policy::arn:<AWS::Partition>:iam::aws:policy/${READ_ONLY_ACCESS_POLICY}`;
    const driftStackFinding =
      'Resource::arn:<AWS::Partition>:cloudformation:*:<AWS::AccountId>:stack/*';

    Validations.of(this.role).acknowledge(
      {
        id: `AwsSolutions-IAM4[${readOnlyAccessFinding}]`,
        reason:
          'The ops assistant needs AWS-managed ReadOnlyAccess so new describe and list APIs stay covered. Secret and data-plane reads that the managed policy grants are explicitly denied on this role.',
      },
      {
        id: 'AwsSolutions-IAM5[Action::ce:Get*]',
        reason:
          'Cost Explorer read APIs use the ce:Get* prefix. Write actions (Create, Update, Delete, Start, Tag) are not included.',
      },
      {
        id: 'AwsSolutions-IAM5[Action::ce:Describe*]',
        reason:
          'Cost Explorer read APIs use the ce:Describe* prefix. Write actions are not included.',
      },
      {
        id: 'AwsSolutions-IAM5[Action::ce:List*]',
        reason: 'Cost Explorer read APIs use the ce:List* prefix. Write actions are not included.',
      },
      {
        id: 'AwsSolutions-IAM5[Resource::*]',
        reason:
          'Cost Explorer does not support resource-level permissions, so ce:Get*, ce:Describe*, and ce:List* require Resource *.',
      },
      {
        id: `AwsSolutions-IAM5[${driftStackFinding}]`,
        reason:
          'Drift detection must cover every stack in this account. DetectStackDrift and DetectStackResourceDrift start a check and do not change stack resources. Stack names and regions are not fixed at synth.',
      },
    );
  }
}

function oidcIssuerHost(oidcUrl: string): string {
  return new URL(oidcUrl).host;
}
