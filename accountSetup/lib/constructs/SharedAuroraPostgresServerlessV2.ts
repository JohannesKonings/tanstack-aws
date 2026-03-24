import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

type SharedAuroraPostgresServerlessV2Props = {
  databaseName?: string;
  minCapacity?: number;
  maxCapacity?: number;
};

const DEFAULT_DATABASE_NAME = 'tanstackaws';
const DEFAULT_MIN_CAPACITY = 0.5;
const DEFAULT_MAX_CAPACITY = 4;

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

    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_17_7,
      }),
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
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
  }
}
