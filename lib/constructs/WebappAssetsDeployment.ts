import type { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
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

    const bucketDeployment = new BucketDeployment(this, 'AssetBucketDeployment', {
      destinationBucket: assetsBucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true,
      memoryLimit: 2048,
      sources: [Source.asset(sourcePath)],
    });
    // if asset bucket in cdk bootstrap is encrypted with a custom Key, allolw to decrypt
    const cdkBootstrapKey = Key.fromLookup(this, 'CdkBootstrapKey', {
      aliasName: 'alias/cdk-bootstrap-key',
    });
    cdkBootstrapKey.grantDecrypt(bucketDeployment.handlerRole);
  }
}
