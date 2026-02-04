// oxlint-disable max-statements
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { DatabasePersons } from './DatabasePersons.ts';
import { DatabaseTodos } from './DatabaseTodos.ts';
import { EventsTable } from './EventsTable.ts';
import { StreamToEventsProcessor } from './StreamToEventsProcessor.ts';
import { WebappApi } from './WebappApi.ts';
import { WebappApiAuthorizer } from './WebappApiAuthorizer.ts';
import { WebappAssetsBucket } from './WebappAssetsBucket.ts';
import { WebappAssetsDeployment } from './WebappAssetsDeployment.ts';
import { WebappDistribution } from './WebappDistribution.ts';
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

    const webappServer = new WebappServer(this, 'WebappServer', {
      tableNameTodos: databaseTodos.dbTodos.tableName,
      tableNamePersons: databasePersons.dbPersons.tableName,
      tableNameEvents: eventsTable.table.tableName,
    });

    databaseTodos.dbTodos.grantReadWriteData(webappServer.webappServer);
    databasePersons.dbPersons.grantReadWriteData(webappServer.webappServer);
    eventsTable.table.grantReadData(webappServer.webappServer);

    const assetsBucket = new WebappAssetsBucket(this, 'WebappAssetsBucket');

    const isProdStage = props.appStage === 'prod';
    const ssmParameterName = `/tanstack-aws/${props.appStage}/cloudfront-base-url`;

    // Create authorizer first - it will read CloudFront URL from SSM parameter
    // For prod, we can set it directly; for non-prod, it will be written to SSM after distribution is created
    const ssoAuthorizer = new WebappApiAuthorizer(this, 'WebappApiAuthorizer', {
      apiBaseUrl: isProdStage ? 'https://tanstack-aws-examples.com' : undefined,
      ssmParameterName: isProdStage ? undefined : ssmParameterName,
    });
    
    // Create API Gateway with authorizer
    const webappApi = new WebappApi(this, 'WebappApi', {
      webappServer: webappServer.webappServer,
      authorizer: ssoAuthorizer.authorizer,
    });

    // Create distribution with the real API Gateway
    const distributionApiGw = new WebappDistribution(this, 'WebappDistributionApiGw', {
      appStage: props.appStage,
      assetsBucket: assetsBucket.assetsBucket,
      webappServerApi: webappApi.webappApi,
    });

    // Write CloudFront URL to SSM parameter for non-prod stages
    // The authorizer will read from this parameter at runtime
    // Using native CDK StringParameter instead of custom resource
    if (!isProdStage) {
      const cloudFrontBaseUrl = `https://${distributionApiGw.distribution.distributionDomainName}`;
      new StringParameter(this, 'CloudFrontUrlParameter', {
        parameterName: ssmParameterName,
        stringValue: cloudFrontBaseUrl,
        description: 'CloudFront distribution base URL for JWT issuer/audience validation',
      });
    }

    new WebappAssetsDeployment(this, 'WebappAssetsDeploymentApiGw', {
      assetsBucket: assetsBucket.assetsBucket,
      distribution: distributionApiGw!.distribution,
    });
  }
}
