import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import type { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import path from 'node:path';

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

    new BucketDeployment(this, 'AssetBucketDeployment', {
      destinationBucket: assetsBucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true,
      sources: [Source.asset(sourcePath)],
    });
  }
}
