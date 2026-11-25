import { Duration, Validations } from 'aws-cdk-lib';
import { CustomResource } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { repoPath } from '../repo-root.ts';
import { hashStageDatabaseMigrations } from './stage-database-migrations-hash.ts';

type StageDatabaseLifecycleProps = {
  clusterArn: string;
  dropDatabaseOnDelete: boolean;
  maintenanceDatabaseName: string;
  secretArn: string;
  stageDatabaseName: string;
};

export class StageDatabaseLifecycle extends Construct {
  constructor(scope: Construct, id: string, props: StageDatabaseLifecycleProps) {
    super(scope, id);

    const handler = new NodejsFunction(this, 'Handler', {
      entry: repoPath('src/lambda/stage-database-lifecycle.ts'),
      bundling: {
        commandHooks: {
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              `mkdir -p '${outputDir}/migrations' && cp -R '${inputDir}/packages/aurora/migrations/.' '${outputDir}/migrations'`,
            ];
          },
          beforeBundling(): string[] {
            return [];
          },
          beforeInstall(): string[] {
            return [];
          },
        },
        externalModules: ['@aws-sdk/*'],
      },
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(180),
    });

    handler.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'rds-data:BeginTransaction',
          'rds-data:CommitTransaction',
          'rds-data:ExecuteStatement',
          'rds-data:RollbackTransaction',
        ],
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

    Validations.of(handler).acknowledge(
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'Lambda uses AWS managed policies; replacing with custom policies adds operational overhead for marginal security gain.',
      },
      {
        id: 'Serverless-LambdaDefaultMemorySize',
        reason: 'Stage database lifecycle runs briefly; 128MB sufficient.',
      },
      {
        id: 'Serverless-LambdaDLQ',
        reason: 'Custom resource; CDK handles provider retries.',
      },
      {
        id: 'Serverless-LambdaTracing',
        reason: 'Stage database lifecycle runs infrequently; X-Ray optional.',
      },
    );

    Validations.of(provider).acknowledge(
      {
        id: 'AwsSolutions-IAM4',
        reason: 'CDK Provider uses AWS managed policies; cannot replace.',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'CDK Provider framework requires broad permissions for custom resource lifecycle.',
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
    );

    new CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      properties: {
        clusterArn: props.clusterArn,
        dropDatabaseOnDelete: props.dropDatabaseOnDelete ? 'true' : 'false',
        maintenanceDatabaseName: props.maintenanceDatabaseName,
        migrationsHash: hashStageDatabaseMigrations(repoPath('packages/aurora/migrations')),
        secretArn: props.secretArn,
        stageDatabaseName: props.stageDatabaseName,
      },
    });
  }
}
