import path from 'node:path';
import { Duration } from 'aws-cdk-lib';
import { CustomResource } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
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

    NagSuppressions.addResourceSuppressions(
      handler,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'Lambda uses AWS managed policies; replacing with custom policies adds operational overhead for marginal security gain.',
        },
        {
          id: 'Serverless-LambdaDefaultMemorySize',
          reason: 'Schema lifecycle runs briefly; 128MB sufficient.',
        },
        {
          id: 'Serverless-LambdaDLQ',
          reason: 'Custom resource; CDK handles provider retries.',
        },
        {
          id: 'Serverless-LambdaTracing',
          reason: 'Schema lifecycle runs infrequently; X-Ray optional.',
        },
      ],
      true,
    );
    NagSuppressions.addResourceSuppressions(
      provider,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CDK Provider uses AWS managed policies; cannot replace.',
          appliesTo: [
            'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          ],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'CDK Provider framework requires broad permissions for custom resource lifecycle.',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'CDK Provider runtime managed by framework.',
        },
        {
          id: 'Serverless-LambdaDefaultMemorySize',
          reason: 'CDK Provider framework default.',
        },
        {
          id: 'Serverless-LambdaDLQ',
          reason: 'CDK Provider; framework handles retries.',
        },
        {
          id: 'Serverless-LambdaLatestVersion',
          reason: 'CDK Provider runtime managed by framework.',
        },
        {
          id: 'Serverless-LambdaTracing',
          reason: 'CDK Provider; low invocation volume.',
        },
      ],
      true,
    );

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
