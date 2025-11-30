import { Construct } from 'constructs';

import { WebappDistribution } from './WebappDistribution.ts';
import { WebappServer } from './WebappServer.ts';
import { WebappAssetsDeployment } from './WebappAssetsDeployment.ts';
import { WebappAssetsBucket } from './WebappAssetsBucket.ts';

type WebappProps = {};

export class Webapp extends Construct {
  constructor(scope: Construct, id: string, props: WebappProps) {
    super(scope, id);
    const {} = props;

    const webappServer = new WebappServer(this, 'WebappServer');

    const assetsBucket = new WebappAssetsBucket(this, 'WebappAssetsBucket');

    const distribution = new WebappDistribution(this, 'WebappDistribution', {
      assetsBucket: assetsBucket.assetsBucket,
      webappServerFunctionUrl: webappServer.webappServerFunctionUrl,
    });

    new WebappAssetsDeployment(this, 'WebappAssetsDeployment', {
      assetsBucket: assetsBucket.assetsBucket,
      distribution: distribution.distribution,
    });
  }
}
