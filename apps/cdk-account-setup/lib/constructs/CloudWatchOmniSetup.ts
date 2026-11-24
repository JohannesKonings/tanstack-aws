import { Stack } from 'aws-cdk-lib';
import { CfnAccessGrant, CfnDomain, CfnSpace } from 'aws-cdk-lib/aws-cloudwatch';
import {
  CfnRole,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { CfnDatasetIntegration } from 'aws-cdk-lib/aws-observabilityadmin';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

const OMNI_NAME = 'tanstack-aws';
const ADDITIONAL_ADMIN_GRANT_NAME = 'additional-admin';

export type CloudWatchOmniSetupProps = {
  readonly adminRoleArn: string;
};

/** CloudWatch Omni domain and space for this account in the workload region. */
export class CloudWatchOmniSetup extends Construct {
  constructor(scope: Construct, id: string, props: CloudWatchOmniSetupProps) {
    super(scope, id);

    const domain = new CfnDomain(this, 'Domain', {
      name: OMNI_NAME,
      identityProviders: ['IAM'],
    });

    const spaceOperatorRole = new Role(this, 'SpaceOperatorRole', {
      assumedBy: new ServicePrincipal('cloudwatch.amazonaws.com'),
      description: 'Space operator role assumed by CloudWatch Omni for this account.',
    });
    replaceAssumeRoleTrust(
      spaceOperatorRole,
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'cloudwatch.amazonaws.com' },
            Action: ['sts:AssumeRole', 'sts:TagSession', 'sts:SetSourceIdentity', 'sts:SetContext'],
            Condition: {
              StringEquals: {
                'aws:SourceAccount': Stack.of(this).account,
              },
            },
          },
        ],
      },
      'Space operator role is not an IAM role.',
    );
    spaceOperatorRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('CloudWatchOmniSpaceAccessPolicy'),
    );
    spaceOperatorRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('CloudWatchOmniAWSIntegrationPolicyV2'),
    );
    const account = Stack.of(this).account;
    const region = Stack.of(this).region;
    // The managed space-access policy allows this action only when
    // cloudwatch:HasAccessGrant is true. CloudWatch assumes this role without that
    // condition, so reading the space is denied until the role allows it directly.
    spaceOperatorRole.addToPolicy(
      new PolicyStatement({
        actions: ['cloudwatch:GetSpaceDataAccess'],
        resources: [`arn:aws:cloudwatch:${region}:${account}:space/*`],
      }),
    );
    NagSuppressions.addResourceSuppressions(
      spaceOperatorRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'CloudWatch Omni requires the AWS-managed CloudWatchOmniSpaceAccessPolicy and CloudWatchOmniAWSIntegrationPolicyV2 on the space operator role.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'GetSpaceDataAccess applies to this account’s space. The space uses this role, so the policy cannot name that space ARN without a circular dependency.',
          appliesTo: [`Resource::arn:aws:cloudwatch:${region}:${account}:space/*`],
        },
      ],
      true,
    );

    const space = new CfnSpace(this, 'Space', {
      name: OMNI_NAME,
      domainId: domain.attrDomainId,
      dataAccessRoleArn: spaceOperatorRole.roleArn,
    });

    new CfnAccessGrant(this, 'AdminAccessGrant', {
      domainId: domain.attrDomainId,
      spaceId: space.attrSpaceId,
      name: ADDITIONAL_ADMIN_GRANT_NAME,
      permission: 'SPACE_ADMIN',
      principal: {
        principalType: 'IAM_ROLE',
        principalId: props.adminRoleArn,
      },
    });

    const datasetIntegrationRole = new Role(this, 'DatasetIntegrationRole', {
      assumedBy: new ServicePrincipal('logs.amazonaws.com'),
      description:
        'Execution role CloudWatch Logs assumes to forward logs and traces into the CloudWatch Dataset.',
    });
    replaceAssumeRoleTrust(
      datasetIntegrationRole,
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'logs.amazonaws.com' },
            Action: 'sts:AssumeRole',
            Condition: {
              StringEquals: { 'aws:SourceAccount': account },
              ArnLike: {
                'aws:SourceArn': `arn:aws:observabilityadmin:${region}:${account}:dataset-integration/default`,
              },
            },
          },
        ],
      },
      'Dataset integration role is not an IAM role.',
    );
    datasetIntegrationRole.addToPolicy(
      new PolicyStatement({
        actions: ['logs:IntegrateWithDataset'],
        resources: [`arn:aws:logs:${region}:${account}:log-group:*`],
      }),
    );
    datasetIntegrationRole.addToPolicy(
      new PolicyStatement({
        actions: ['cloudwatch:PutRecords'],
        resources: ['*'],
      }),
    );
    NagSuppressions.addResourceSuppressions(
      datasetIntegrationRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Dataset integration forwards every non-delivery log group in this account and region. AWS requires logs:IntegrateWithDataset on log-group:* and cloudwatch:PutRecords on *.',
        },
      ],
      true,
    );

    new CfnDatasetIntegration(this, 'DatasetIntegration', {
      roleArn: datasetIntegrationRole.roleArn,
    });
  }
}

type AssumeRoleTrustDocument = {
  Version: '2012-10-17';
  Statement: Array<{
    Effect: 'Allow';
    Principal: { Service: string };
    Action: string | string[];
    Condition: Record<string, Record<string, string>>;
  }>;
};

function replaceAssumeRoleTrust(
  role: Role,
  assumeRolePolicyDocument: AssumeRoleTrustDocument,
  missingRoleMessage: string,
): void {
  const resource = role.node.defaultChild;
  if (!(resource instanceof CfnRole)) {
    throw new Error(missingRoleMessage);
  }
  resource.assumeRolePolicyDocument = assumeRolePolicyDocument;
}
