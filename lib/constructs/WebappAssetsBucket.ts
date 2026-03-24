import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export class WebappAssetsBucket extends Construct {
  readonly assetsBucket: Bucket;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.assetsBucket = new Bucket(this, 'AssetsBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    NagSuppressions.addResourceSuppressions(
      this.assetsBucket,
      [
        {
          id: 'AwsSolutions-S1',
          reason: 'Not needed yet; bucket accessed only via CloudFront OAC.',
        },
        {
          id: 'AwsSolutions-S3',
          reason: 'Content built before deployment and reproducible; versioning not required.',
        },
      ],
      true,
    );
  }
}
