/**
 * Deferred until CloudFormation AWS::Logs::AccountPolicy supports PolicyType RETENTION_POLICY.
 * The Logs API already accepts this through PutAccountPolicy. Restore the custom resource
 * below when CloudFormation can express it, then wire it back into AccountSetupStack and
 * WorkloadRegionAccountSetupStack.
 */
/*
import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

const POLICY_NAME = 'account-log-retention';
const POLICY_TYPE = 'RETENTION_POLICY';
const POLICY_DOCUMENT = '{"retentionInDays":30,"enforcementMode":"RETROACTIVE"}';

// Account-level log retention for every log group in this stack's region.
// CloudFormation AWS::Logs::AccountPolicy cannot express RETENTION_POLICY.
export class AccountLogRetentionPolicy extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const putAccountPolicy = {
      service: 'CloudWatchLogs',
      action: 'putAccountPolicy',
      parameters: {
        policyName: POLICY_NAME,
        policyType: POLICY_TYPE,
        policyDocument: POLICY_DOCUMENT,
      },
      physicalResourceId: PhysicalResourceId.of(POLICY_NAME),
    };

    const policy = new AwsCustomResource(this, 'Policy', {
      installLatestAwsSdk: false,
      memorySize: 256,
      onCreate: putAccountPolicy,
      onUpdate: putAccountPolicy,
      onDelete: {
        service: 'CloudWatchLogs',
        action: 'deleteAccountPolicy',
        parameters: {
          policyName: POLICY_NAME,
          policyType: POLICY_TYPE,
        },
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ['logs:PutAccountPolicy', 'logs:DeleteAccountPolicy'],
          resources: ['*'],
        }),
      ]),
    });

    NagSuppressions.addResourceSuppressions(
      policy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'CloudWatch Logs account policies are account-level. PutAccountPolicy and DeleteAccountPolicy do not support a resource ARN.',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );

    const providerId = `AWS${AwsCustomResource.PROVIDER_FUNCTION_UUID.replaceAll('-', '')}`;
    const provider = Stack.of(this).node.tryFindChild(providerId);
    if (!provider) {
      throw new Error('Account-level log retention custom resource provider was not created.');
    }

    NagSuppressions.addResourceSuppressions(
      provider,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'The account-level log retention custom resource uses the CDK singleton Lambda basic execution role.',
          appliesTo: [
            'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          ],
        },
        {
          id: 'Serverless-LambdaDLQ',
          reason:
            'The CDK account-policy custom resource provider does not expose a dead-letter queue. CloudFormation retries the PutAccountPolicy and DeleteAccountPolicy calls.',
        },
        {
          id: 'Serverless-LambdaTracing',
          reason:
            'The CDK account-policy custom resource provider does not expose X-Ray tracing. The handler only calls CloudWatch Logs account policy APIs.',
        },
      ],
      true,
    );
  }
}
*/
