import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

type SharedAuroraPostgresServerlessV2Props = {
  databaseName?: string;
  minCapacity?: number;
  maxCapacity?: number;
};

const DEFAULT_DATABASE_NAME = 'tanstackaws';
const DEFAULT_MIN_CAPACITY = 0.5;
const DEFAULT_MAX_CAPACITY = 4;

/** Aurora PostgreSQL Serverless v2 cluster, Data API only. Cluster endpoints are unreachable; no direct TCP connections. */
export class SharedAuroraPostgresServerlessV2 extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: rds.DatabaseCluster;
  public readonly databaseName: string;

  constructor(scope: Construct, id: string, props: SharedAuroraPostgresServerlessV2Props = {}) {
    super(scope, id);
    this.databaseName = props.databaseName ?? DEFAULT_DATABASE_NAME;

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security group with NO ingress - Data API only; cluster endpoints are unreachable
    const clusterSecurityGroup = new ec2.SecurityGroup(this, 'ClusterSecurityGroup', {
      vpc: this.vpc,
      description: 'Aurora cluster - Data API only, no direct connections',
      allowAllOutbound: true,
    });

    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_17_7,
      }),
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [clusterSecurityGroup],
      enableDataApi: true,
      defaultDatabaseName: this.databaseName,
      credentials: rds.Credentials.fromGeneratedSecret('clusteradmin'),
      serverlessV2MinCapacity: props.minCapacity ?? DEFAULT_MIN_CAPACITY,
      serverlessV2MaxCapacity: props.maxCapacity ?? DEFAULT_MAX_CAPACITY,
      deletionProtection: true,
      backup: {
        retention: Duration.days(7),
      },
      cloudwatchLogsExports: ['postgresql'],
      copyTagsToSnapshot: true,
      storageEncrypted: true,
    });

    this.cluster.applyRemovalPolicy(RemovalPolicy.SNAPSHOT);

    NagSuppressions.addResourceSuppressions(this.vpc, [
      {
        id: 'AwsSolutions-VPC7',
        reason: 'VPC Flow Logs add cost; account-setup stack for shared Aurora.',
      },
    ]);
    NagSuppressions.addResourceSuppressions(
      this.cluster,
      [
        {
          id: 'AwsSolutions-RDS11',
          reason: 'Port obfuscation adds operational complexity; Aurora in private subnets.',
        },
        {
          id: 'AwsSolutions-RDS6',
          reason:
            'This cluster is accessed via RDS Data API with Secrets Manager auth; IAM DB auth is not used.',
        },
        {
          id: 'AwsSolutions-RDS16',
          reason: 'Aurora PostgreSQL exports postgresql logs; RDS16 targets MySQL log types.',
        },
        {
          id: 'AwsSolutions-SMG4',
          reason:
            'Shared bootstrap secret rotation is handled out-of-band to avoid automatic credential churn.',
        },
      ],
      true,
    );
  }
}
