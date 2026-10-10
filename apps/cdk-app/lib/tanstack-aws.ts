import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SharedWorkloadData } from './constructs/SharedWorkloadData.ts';
import { WorkloadFrontend } from './constructs/WorkloadFrontend.ts';
import { webappServerEnvironment, webappServerStackOutputs } from './webapp-server-environment.ts';

type TanstackAwsStackProps = cdk.StackProps & {
  appStage: string;
};

export class TanstackAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TanstackAwsStackProps) {
    super(scope, id, props);

    const sharedData = new SharedWorkloadData(this, 'SharedWorkloadData', {
      appStage: props.appStage,
    });
    const environment = webappServerEnvironment({
      AURORA_CLUSTER_ARN: sharedData.auroraClusterArn,
      AURORA_SECRET_ARN: sharedData.auroraSecretArn,
      AURORA_DATABASE_NAME: sharedData.stageDatabaseName,
      AURORA_SCHEMA: sharedData.auroraSchema,
      DDB_TODOS_TABLE_NAME: sharedData.dbTodos.tableName,
      DDB_PERSONS_TABLE_NAME: sharedData.dbPersons.tableName,
      EVENTS_TABLE: sharedData.eventsTable.tableName,
    });

    new WorkloadFrontend(this, 'Webapp', {
      appLabel: 'Webapp',
      appStage: props.appStage,
      environment,
      sharedData,
      serverAssetPath: '.output/server',
      publicAssetPath: '.output/public',
    });

    new WorkloadFrontend(this, 'WebappAdmin', {
      appLabel: 'Webapp admin',
      appStage: props.appStage,
      environment,
      sharedData,
      serverAssetPath: 'apps/webapp-admin/.output/server',
      publicAssetPath: 'apps/webapp-admin/.output/public',
      customHostname: 'admin.tanstack-aws-examples.com',
      // A pricing-plan WebACL can belong to only one distribution. The public
      // webapp owns it, so admin stays without a WebACL.
      attachProtectedWebAcl: false,
    });

    for (const output of webappServerStackOutputs(environment)) {
      new cdk.CfnOutput(this, output.logicalId, {
        exportName: `${this.stackName}-${output.logicalId}`,
        value: output.value,
      });
    }
  }
}
