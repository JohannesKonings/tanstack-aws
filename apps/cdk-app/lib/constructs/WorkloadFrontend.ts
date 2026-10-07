import { Construct } from 'constructs';
import type { SharedWorkloadData } from './SharedWorkloadData.ts';
import { WebappApi } from './WebappApi.ts';
import { WebappAssetsBucket } from './WebappAssetsBucket.ts';
import { WebappAssetsDeployment } from './WebappAssetsDeployment.ts';
import { WebappDistribution } from './WebappDistribution.ts';
import { WebappFunctionUrl } from './WebappFunctionUrl.ts';
import { WebappServer } from './WebappServer.ts';

type WorkloadFrontendProps = {
  appStage: string;
  /** Human-readable app name used in the CloudFront distribution description. */
  appLabel: string;
  sharedData: SharedWorkloadData;
  serverAssetPath: string;
  publicAssetPath: string;
  customHostname?: string;
};

export class WorkloadFrontend extends Construct {
  constructor(scope: Construct, id: string, props: WorkloadFrontendProps) {
    super(scope, id);

    const { appStage, appLabel, sharedData, serverAssetPath, publicAssetPath, customHostname } =
      props;

    const webappServer = new WebappServer(this, 'WebappServer', {
      appStage,
      auroraClusterArn: sharedData.auroraClusterArn,
      auroraSecretArn: sharedData.auroraSecretArn,
      auroraDatabaseName: sharedData.auroraDatabaseName,
      tableNameTodos: sharedData.dbTodos.tableName,
      tableNamePersons: sharedData.dbPersons.tableName,
      tableNameEvents: sharedData.eventsTable.tableName,
      serverAssetPath,
    });

    sharedData.dbTodos.grantReadWriteData(webappServer.webappServer);
    sharedData.dbPersons.grantReadWriteData(webappServer.webappServer);
    sharedData.eventsTable.grantReadData(webappServer.webappServer);

    const webappServerFunctionUrl = new WebappFunctionUrl(this, 'WebappServerFunctionUrl', {
      webappServer: webappServer.webappServer,
    });

    const webappApi = new WebappApi(this, 'WebappApi', {
      webappServer: webappServer.webappServer,
    });

    const assetsBucket = new WebappAssetsBucket(this, 'WebappAssetsBucket');

    const distributionApiGw = new WebappDistribution(this, 'WebappDistributionApiGw', {
      appStage,
      assetsBucket: assetsBucket.assetsBucket,
      customHostname,
      description: `tanstack-aws ${appLabel} (${appStage})`,
      originBehaviorKind: 'apiGw',
      webappServerApi: webappApi.webappApi,
      webappServerFunctionUrl: webappServerFunctionUrl.webappServerFunctionUrl,
    });

    new WebappAssetsDeployment(this, 'WebappAssetsDeploymentApiGw', {
      assetsBucket: assetsBucket.assetsBucket,
      distribution: distributionApiGw.distribution,
      publicAssetPath,
    });
  }
}
