// oxlint-disable max-statements
import { Construct } from 'constructs';
import { DatabasePersons } from './DatabasePersons.ts';
import { DatabaseTodos } from './DatabaseTodos.ts';
import { WebappApi } from './WebappApi.ts';
import { WebappAssetsBucket } from './WebappAssetsBucket.ts';
import { WebappAssetsDeployment } from './WebappAssetsDeployment.ts';
import { WebappDistribution } from './WebappDistribution.ts';
import { WebappFunctionUrl } from './WebappFunctionUrl.ts';
import { WebappServer } from './WebappServer.ts';

export class Webapp extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const databaseTodos = new DatabaseTodos(this, 'DatabaseTodos');
    const databasePersons = new DatabasePersons(this, 'DatabasePersons');

    const webappServer = new WebappServer(this, 'WebappServer', {
      tableNameTodos: databaseTodos.dbTodos.tableName,
      tableNamePersons: databasePersons.dbPersons.tableName,
    });

    databaseTodos.dbTodos.grantReadWriteData(webappServer.webappServer);
    databasePersons.dbPersons.grantReadWriteData(webappServer.webappServer);

    const webappServerFunctionUrl = new WebappFunctionUrl(this, 'WebappServerFunctionUrl', {
      webappServer: webappServer.webappServer,
    });

    const webappApi = new WebappApi(this, 'WebappApi', {
      webappServer: webappServer.webappServer,
    });

    const assetsBucket = new WebappAssetsBucket(this, 'WebappAssetsBucket');

    // const distributionFunctionUrl = new WebappDistribution(this, 'WebappDistributionFunctionUrl', {
    //   assetsBucket: assetsBucket.assetsBucket,
    //   originBehaviorKind: 'functionUrl',
    //   webappServerApi: webappApi.webappApi,
    //   webappServerFunctionUrl: webappServerFunctionUrl.webappServerFunctionUrl,
    // });

    // new WebappAssetsDeployment(this, 'WebappAssetsDeploymentFunctionUrl', {
    //   assetsBucket: assetsBucket.assetsBucket,
    //   distribution: distributionFunctionUrl.distribution,
    // });

    const distributionApiGw = new WebappDistribution(this, 'WebappDistributionApiGw', {
      assetsBucket: assetsBucket.assetsBucket,
      originBehaviorKind: 'apiGw',
      webappServerApi: webappApi.webappApi,
      webappServerFunctionUrl: webappServerFunctionUrl.webappServerFunctionUrl,
    });

    new WebappAssetsDeployment(this, 'WebappAssetsDeploymentApiGw', {
      assetsBucket: assetsBucket.assetsBucket,
      distribution: distributionApiGw.distribution,
    });
  }
}
