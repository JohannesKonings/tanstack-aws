import path from 'node:path';
import { Stack } from 'aws-cdk-lib';
import type { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Alias } from 'aws-cdk-lib/aws-kms';
import { SingletonFunction } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

type WebappAssetsDeploymentProps = {
  assetsBucket: Bucket;
  distribution: Distribution;
};

export class WebappAssetsDeployment extends Construct {
  constructor(scope: Construct, id: string, props: WebappAssetsDeploymentProps) {
    super(scope, id);

    const { assetsBucket, distribution } = props;

    const sourcePath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../.output/public',
    );

    const bucketDeployment = new BucketDeployment(this, 'AssetBucketDeployment', {
      destinationBucket: assetsBucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true,
      memoryLimit: 2048,
      sources: [Source.asset(sourcePath)],
    });
    // Import alias only (no lookup): grant decrypt on the CDK bootstrap key used for asset buckets.
    const cdkBootstrapKey = Alias.fromAliasName(
      this,
      'CdkBootstrapKeyAlias',
      'alias/cdk-bootstrap-key',
    );
    cdkBootstrapKey.grantDecrypt(bucketDeployment.handlerRole);

    const handler = bucketDeployment.node.tryFindChild('CustomResourceHandler');
    if (!(handler instanceof SingletonFunction)) {
      throw new Error(
        'Expected BucketDeployment child CustomResourceHandler to be a SingletonFunction',
      );
    }
    const deploymentLambda = Stack.of(this).node.tryFindChild(handler.constructName);
    if (!deploymentLambda) {
      throw new Error(
        `BucketDeployment singleton lambda "${handler.constructName}" not found on stack`,
      );
    }

    NagSuppressions.addResourceSuppressions(
      deploymentLambda,
      [
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
            'BucketDeployment requires broad S3 and CloudFront permissions for asset sync per CDK s3-deployment design.',
        },
        {
          id: 'Serverless-LambdaDLQ',
          reason:
            'CDK BucketDeployment custom resource; failures surface in CloudFormation stack events.',
        },
        {
          id: 'Serverless-LambdaLatestVersion',
          reason: 'CDK BucketDeployment runtime is owned by aws-cdk-lib aws-s3-deployment.',
        },
        {
          id: 'Serverless-LambdaTracing',
          reason: 'CDK BucketDeployment runs during deploy only; active tracing not required.',
        },
      ],
      true,
    );
  }
}
