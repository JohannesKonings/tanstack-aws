// oxlint-disable max-statements
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { resolveAuroraSchemaName } from '../aurora-schema.ts';
import { resolveStageLifecycle } from '../stage-name.ts';
import { AuroraSchemaLifecycle } from './AuroraSchemaLifecycle.ts';
import { DatabasePersons } from './DatabasePersons.ts';
import { DatabaseTodos } from './DatabaseTodos.ts';
import { EventsTable } from './EventsTable.ts';
import { StreamToEventsProcessor } from './StreamToEventsProcessor.ts';
import { WebappApi } from './WebappApi.ts';
import { WebappAssetsBucket } from './WebappAssetsBucket.ts';
import { WebappAssetsDeployment } from './WebappAssetsDeployment.ts';
import { WebappDistribution } from './WebappDistribution.ts';
import { WebappFunctionUrl } from './WebappFunctionUrl.ts';
import { WebappServer } from './WebappServer.ts';

type WebappProps = {
  appStage: string;
};

export class Webapp extends Construct {
  constructor(scope: Construct, id: string, props: WebappProps) {
    super(scope, id);

    const databaseTodos = new DatabaseTodos(this, 'DatabaseTodos');
    const databasePersons = new DatabasePersons(this, 'DatabasePersons');

    // SSE Real-time Sync Infrastructure
    // Events table stores change events from DynamoDB Streams for SSE clients
    const eventsTable = new EventsTable(this, 'EventsTable');

    // Stream processor writes Persons table changes to Events table
    new StreamToEventsProcessor(this, 'StreamToEventsProcessor', {
      personsTable: databasePersons.dbPersons,
      eventsTable: eventsTable.table,
    });

    const auroraClusterArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/tanstack-aws/shared/aurora/cluster-arn',
    );
    const auroraSecretArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/tanstack-aws/shared/aurora/secret-arn',
    );
    const auroraDatabaseName = ssm.StringParameter.valueForStringParameter(
      this,
      '/tanstack-aws/shared/aurora/database-name',
    );
    const auroraSchema = resolveAuroraSchemaName(props.appStage);
    const appLifecycle = resolveStageLifecycle(props.appStage);

    new AuroraSchemaLifecycle(this, 'AuroraSchemaLifecycle', {
      clusterArn: auroraClusterArn,
      databaseName: auroraDatabaseName,
      deleteSchemaOnDelete: appLifecycle === 'ephemeral',
      schemaName: auroraSchema,
      secretArn: auroraSecretArn,
    });

    const webappServer = new WebappServer(this, 'WebappServer', {
      appStage: props.appStage,
      auroraClusterArn,
      auroraSecretArn,
      auroraDatabaseName,
      tableNameTodos: databaseTodos.dbTodos.tableName,
      tableNamePersons: databasePersons.dbPersons.tableName,
      tableNameEvents: eventsTable.table.tableName,
    });

    databaseTodos.dbTodos.grantReadWriteData(webappServer.webappServer);
    databasePersons.dbPersons.grantReadWriteData(webappServer.webappServer);
    eventsTable.table.grantReadData(webappServer.webappServer);

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
      appStage: props.appStage,
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
