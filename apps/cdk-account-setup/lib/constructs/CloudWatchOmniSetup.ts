import { CfnResource, Stack, Validations } from 'aws-cdk-lib';
import {
  CfnRole,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

const OMNI_NAME = 'tanstack-aws';
const unknownCloudFormationResourceReason =
  'aws-cdk-lib 2.272.0 has no L1 for this published CloudFormation resource, so account setup declares it directly.';

/** CloudWatch Omni domain and space for this account in the workload region. */
export class CloudWatchOmniSetup extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const domain = new CfnResource(this, 'Domain', {
      type: 'AWS::CloudWatch::Domain',
      properties: {
        Name: OMNI_NAME,
        IdentityProviders: ['IAM'],
      },
    });
    acknowledgeUnknownCloudFormationResource(domain);

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
    NagSuppressions.addResourceSuppressions(spaceOperatorRole, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'CloudWatch Omni requires the AWS-managed CloudWatchOmniSpaceAccessPolicy and CloudWatchOmniAWSIntegrationPolicyV2 on the space operator role.',
      },
    ]);

    const space = new CfnResource(this, 'Space', {
      type: 'AWS::CloudWatch::Space',
      properties: {
        Name: OMNI_NAME,
        DomainId: domain.getAtt('DomainId'),
        DataAccessRoleArn: spaceOperatorRole.roleArn,
      },
    });
    acknowledgeUnknownCloudFormationResource(space);

    const account = Stack.of(this).account;
    const region = Stack.of(this).region;
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

    const datasetIntegration = new CfnResource(this, 'DatasetIntegration', {
      type: 'AWS::ObservabilityAdmin::DatasetIntegration',
      properties: {
        RoleArn: datasetIntegrationRole.roleArn,
      },
    });
    acknowledgeUnknownCloudFormationResource(datasetIntegration);
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

function acknowledgeUnknownCloudFormationResource(resource: CfnResource): void {
  Validations.of(resource).acknowledge({
    id: 'CloudFormation-Validate::F3006',
    reason: unknownCloudFormationResourceReason,
  });
}
