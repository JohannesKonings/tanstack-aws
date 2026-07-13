import type { BlocksBackend } from '@aws-blocks/blocks/cdk';
import { Stack } from 'aws-cdk-lib';
import { SingletonFunction } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment } from 'aws-cdk-lib/aws-s3-deployment';
import { NagSuppressions } from 'cdk-nag';

const blocksApiSuppressions = [
  {
    id: 'AwsSolutions-APIG1',
    reason: 'Blocks sidecar API; access logging deferred for demo lane.',
  },
  {
    id: 'AwsSolutions-APIG2',
    reason: 'Blocks RPC API validates input in Lambda handlers.',
  },
  {
    id: 'AwsSolutions-APIG3',
    reason: 'Blocks API is an internal sidecar reached from the webapp, not public internet.',
  },
  {
    id: 'AwsSolutions-APIG4',
    reason: 'Blocks API is called server-side from the webapp Lambda; no public auth surface.',
  },
  {
    id: 'AwsSolutions-APIG6',
    reason: 'Blocks sidecar API; stage logging deferred for demo lane.',
  },
  {
    id: 'AwsSolutions-COG4',
    reason: 'Blocks demo lane does not use Cognito on the sidecar API.',
  },
  {
    id: 'AwsSolutions-IAM4',
    reason: 'API Gateway CloudWatch role uses AWS managed policy per design.',
    appliesTo: [
      'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs',
    ],
  },
  {
    id: 'Serverless-APIGWAccessLogging',
    reason: 'Blocks sidecar API; access logging deferred for demo lane.',
  },
  {
    id: 'Serverless-APIGWDefaultThrottling',
    reason: 'Blocks sidecar API uses default throttling; low-traffic demo workload.',
  },
  {
    id: 'Serverless-APIGWXrayEnabled',
    reason: 'X-Ray optional for Blocks sidecar API in demo lane.',
  },
];

const blocksHandlerSuppressions = [
  {
    id: 'AwsSolutions-IAM4',
    reason:
      'Blocks handler uses AWS managed execution role policy; custom policy adds overhead for demo lane.',
    appliesTo: [
      'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    ],
  },
  {
    id: 'AwsSolutions-IAM5',
    reason:
      'Blocks handler needs DynamoDB index ARN patterns and S3 config bucket object access granted by AWS Blocks.',
  },
  {
    id: 'Serverless-LambdaDLQ',
    reason: 'DLQ adds cost; Blocks handler errors surface in API responses and CloudWatch logs.',
  },
  {
    id: 'Serverless-LambdaTracing',
    reason: 'X-Ray optional for Blocks sidecar handler in demo lane.',
  },
];

const blocksConfigBucketSuppressions = [
  {
    id: 'AwsSolutions-S1',
    reason: 'Blocks config bucket is deployment-only and not user-facing.',
  },
  {
    id: 'AwsSolutions-S10',
    reason: 'Blocks config bucket is accessed only by the Blocks Lambda over HTTPS.',
  },
];

const bucketDeploymentSuppressions = [
  {
    id: 'AwsSolutions-L1',
    reason:
      'CDK BucketDeployment uses framework-managed Lambda runtime; version follows aws-cdk-lib releases.',
  },
  {
    id: 'AwsSolutions-IAM4',
    reason:
      'CDK BucketDeployment handler uses AWS managed execution role policy from the framework.',
    appliesTo: [
      'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    ],
  },
  {
    id: 'AwsSolutions-IAM5',
    reason:
      'BucketDeployment requires broad S3 permissions for config upload per CDK s3-deployment design.',
  },
  {
    id: 'Serverless-LambdaDLQ',
    reason:
      'CDK BucketDeployment custom resource; failures surface in CloudFormation stack events.',
  },
  {
    id: 'Serverless-LambdaDefaultMemorySize',
    reason: 'CDK BucketDeployment memory is owned by aws-cdk-lib aws-s3-deployment.',
  },
  {
    id: 'Serverless-LambdaLatestVersion',
    reason: 'CDK BucketDeployment runtime is owned by aws-cdk-lib aws-s3-deployment.',
  },
  {
    id: 'Serverless-LambdaTracing',
    reason: 'CDK BucketDeployment runs during deploy only; active tracing not required.',
  },
];

const suppressBlocksConfigDeployment = (blocksBackend: BlocksBackend): void => {
  const bucketDeployment = blocksBackend.node.tryFindChild('BlocksConfigDeployment');
  if (!(bucketDeployment instanceof BucketDeployment)) {
    return;
  }

  const handler = bucketDeployment.node.tryFindChild('CustomResourceHandler');
  if (!(handler instanceof SingletonFunction)) {
    return;
  }

  const deploymentProvider = Stack.of(blocksBackend).node.tryFindChild(handler.constructName);
  if (!deploymentProvider) {
    return;
  }

  NagSuppressions.addResourceSuppressions(
    deploymentProvider,
    [...bucketDeploymentSuppressions],
    true,
  );
};

export const applyBlocksBackendNagSuppressions = (blocksBackend: BlocksBackend): void => {
  NagSuppressions.addResourceSuppressions(
    blocksBackend.handler,
    [...blocksHandlerSuppressions],
    true,
  );

  NagSuppressions.addResourceSuppressions(blocksBackend.gateway, [...blocksApiSuppressions], true);

  const configBucket = blocksBackend.node.tryFindChild('BlocksConfigBucket');
  if (configBucket instanceof Bucket) {
    NagSuppressions.addResourceSuppressions(
      configBucket,
      [...blocksConfigBucketSuppressions],
      true,
    );
  }

  suppressBlocksConfigDeployment(blocksBackend);
};
