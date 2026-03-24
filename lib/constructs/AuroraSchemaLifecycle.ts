import path from 'node:path';
import { Duration } from 'aws-cdk-lib';
import { CustomResource } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

type AuroraSchemaLifecycleProps = {
  clusterArn: string;
  databaseName: string;
  deleteSchemaOnDelete: boolean;
  schemaName: string;
  secretArn: string;
};

export class AuroraSchemaLifecycle extends Construct {
  constructor(scope: Construct, id: string, props: AuroraSchemaLifecycleProps) {
    super(scope, id);

    const handler = new NodejsFunction(this, 'Handler', {
      entry: path.join(
        path.dirname(new URL(import.meta.url).pathname),
        '../../src/lambda/aurora-schema-lifecycle.ts',
      ),
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
    });

    handler.addToRolePolicy(
      new PolicyStatement({
        actions: ['rds-data:ExecuteStatement'],
        effect: Effect.ALLOW,
        resources: [props.clusterArn],
      }),
    );

    handler.addToRolePolicy(
      new PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        effect: Effect.ALLOW,
        resources: [props.secretArn],
      }),
    );

    const provider = new Provider(this, 'Provider', {
      onEventHandler: handler,
    });

    new CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      properties: {
        clusterArn: props.clusterArn,
        databaseName: props.databaseName,
        deleteSchemaOnDelete: props.deleteSchemaOnDelete ? 'true' : 'false',
        schemaName: props.schemaName,
        secretArn: props.secretArn,
      },
    });
  }
}
