import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { AgentSpaces } from './constructs/AgentSpaces.ts';
import { SharedAuroraPostgresServerlessV2 } from './constructs/SharedAuroraPostgresServerlessV2.ts';

export type WorkloadRegionAccountSetupStackProps = cdk.StackProps & {
  readonly securityAgent?: boolean;
  readonly devopsAgent?: boolean;
};

export class WorkloadRegionAccountSetupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WorkloadRegionAccountSetupStackProps = {}) {
    super(scope, id, props);

    new AgentSpaces(this, 'AgentSpaces', {
      securityAgent: props.securityAgent ?? true,
      devopsAgent: props.devopsAgent ?? true,
    });

    const sharedAurora = new SharedAuroraPostgresServerlessV2(
      this,
      'SharedAuroraPostgresServerlessV2',
    );
    const sharedAuroraSecret = sharedAurora.cluster.secret;

    if (!sharedAuroraSecret) {
      throw new Error('Shared Aurora cluster secret was not created.');
    }

    const parameterPrefix = '/tanstack-aws/shared/aurora';

    new ssm.StringParameter(this, 'SharedAuroraClusterArnParameter', {
      parameterName: `${parameterPrefix}/cluster-arn`,
      stringValue: sharedAurora.cluster.clusterArn,
    });
    new ssm.StringParameter(this, 'SharedAuroraSecretArnParameter', {
      parameterName: `${parameterPrefix}/secret-arn`,
      stringValue: sharedAuroraSecret.secretArn,
    });
    new ssm.StringParameter(this, 'SharedAuroraDatabaseNameParameter', {
      parameterName: `${parameterPrefix}/database-name`,
      stringValue: sharedAurora.databaseName,
    });

    new cdk.CfnOutput(this, 'SharedAuroraClusterArn', {
      value: sharedAurora.cluster.clusterArn,
      description: 'Shared Aurora PostgreSQL cluster ARN.',
    });
    new cdk.CfnOutput(this, 'SharedAuroraSecretArn', {
      value: sharedAuroraSecret.secretArn,
      description: 'Secrets Manager ARN for shared Aurora credentials.',
    });
    new cdk.CfnOutput(this, 'SharedAuroraDatabaseName', {
      value: sharedAurora.databaseName,
      description: 'Shared Aurora default database name.',
    });
  }
}
