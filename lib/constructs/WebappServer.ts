import path from 'node:path';
import { Duration, Tags } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { resolveAuroraSchemaName } from '../aurora-schema.ts';
import { TIMEOUT_IN_SECONDS } from './type.ts';

type WebappServerProps = {
  appStage: string;
  auroraClusterArn: string;
  auroraSecretArn: string;
  auroraDatabaseName: string;
  tableNameTodos: string;
  tableNamePersons: string;
  tableNameEvents: string;
};
export class WebappServer extends Construct {
  readonly webappServer: Function;

  constructor(scope: Construct, id: string, props: WebappServerProps) {
    super(scope, id);

    const {
      appStage,
      auroraClusterArn,
      auroraSecretArn,
      auroraDatabaseName,
      tableNameTodos,
      tableNamePersons,
      tableNameEvents,
    } = props;
    const auroraSchema = resolveAuroraSchemaName(appStage);

    this.webappServer = new Function(this, 'WebappServer', {
      code: Code.fromAsset(
        path.join(path.dirname(new URL(import.meta.url).pathname), '../../.output/server'),
      ),
      reservedConcurrentExecutions: 100,
      // functionName: PhysicalName.GENERATE_IF_NEEDED,
      handler: 'index.handler',
      memorySize: 2048,
      runtime: Runtime.NODEJS_24_X,
      // oxlint-disable-next-line no-magic-numbers
      timeout: Duration.seconds(TIMEOUT_IN_SECONDS),
      // timeout: Duration.seconds(60),
      environment: {
        AURORA_CLUSTER_ARN: auroraClusterArn,
        AURORA_SECRET_ARN: auroraSecretArn,
        AURORA_DATABASE_NAME: auroraDatabaseName,
        AURORA_SCHEMA: auroraSchema,
        DDB_TODOS_TABLE_NAME: tableNameTodos,
        DDB_PERSONS_TABLE_NAME: tableNamePersons,
        EVENTS_TABLE: tableNameEvents,
      },
      tracing: Tracing.ACTIVE,
    });

    this.webappServer.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'rds-data:ExecuteStatement',
          'rds-data:BatchExecuteStatement',
          'rds-data:BeginTransaction',
          'rds-data:CommitTransaction',
          'rds-data:RollbackTransaction',
        ],
        effect: Effect.ALLOW,
        resources: [auroraClusterArn],
      }),
    );

    const auroraSecret = Secret.fromSecretCompleteArn(this, 'AuroraSecret', auroraSecretArn);
    auroraSecret.grantRead(this.webappServer);
    Tags.of(this.webappServer).add('IsWebAppServer', 'true');

    this.webappServer.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        effect: Effect.ALLOW,
        resources: ['*'],
      }),
    );

    this.webappServer.addToRolePolicy(
      new PolicyStatement({
        actions: ['cloudwatch:GetMetricStatistics', 'cloudwatch:ListMetrics'],
        effect: Effect.ALLOW,
        resources: ['*'],
      }),
    );
  }
}
