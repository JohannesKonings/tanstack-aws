import { describe, expect, it } from 'vite-plus/test';
import { prepareStageDatabaseMigration, type StackOutput } from './stage-database-migrate.ts';

const outputs: StackOutput[] = [
  {
    OutputKey: 'AuroraClusterArn',
    OutputValue: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
  },
  {
    OutputKey: 'AuroraSecretArn',
    OutputValue: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared',
  },
  { OutputKey: 'AuroraDatabaseName', OutputValue: 'feature_checkout' },
  { OutputKey: 'AuroraSchema', OutputValue: 'default' },
];

const recordingLookup = (stackOutputs: readonly StackOutput[] = outputs) => {
  const described: { region: string; stackName: string }[] = [];
  const parameters: { name: string; region: string }[] = [];
  return {
    described,
    parameters,
    describeStack: (input: { region: string; stackName: string }) => {
      described.push(input);
      return Promise.resolve(stackOutputs);
    },
    readParameter: (input: { name: string; region: string }) => {
      parameters.push(input);
      return Promise.resolve('tanstackaws');
    },
  };
};

describe('stage database migrate', () => {
  it('creates the feature stage database from the maintenance database and does not drop it', async () => {
    const lookup = recordingLookup();

    const prepared = await prepareStageDatabaseMigration({
      appStage: undefined,
      branch: 'feature/checkout',
      describeStack: lookup.describeStack,
      readParameter: lookup.readParameter,
      region: undefined,
    });

    expect(lookup.described).toEqual([
      { region: 'us-east-2', stackName: 'TanstackAwsStack-feature-checkout' },
    ]);
    expect(lookup.parameters).toEqual([
      { name: '/tanstack-aws/shared/aurora/database-name', region: 'us-east-2' },
    ]);
    expect(prepared).toEqual({
      clusterArn: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
      region: 'us-east-2',
      request: {
        dropDatabaseOnDelete: false,
        maintenanceDatabase: 'tanstackaws',
        requestType: 'Create',
        stageDatabaseName: 'feature_checkout',
      },
      secretArn: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared',
      stageDatabaseName: 'feature_checkout',
    });
  });

  it('uses AWS_REGION and selects prod only when APP_STAGE is prod', async () => {
    const lookup = recordingLookup([
      { OutputKey: 'AuroraClusterArn', OutputValue: 'arn:cluster' },
      { OutputKey: 'AuroraSecretArn', OutputValue: 'arn:secret' },
      { OutputKey: 'AuroraDatabaseName', OutputValue: 'prod' },
    ]);

    const prepared = await prepareStageDatabaseMigration({
      appStage: 'prod',
      branch: 'feature/checkout',
      describeStack: lookup.describeStack,
      readParameter: lookup.readParameter,
      region: 'eu-central-1',
    });

    expect(lookup.described).toEqual([
      { region: 'eu-central-1', stackName: 'TanstackAwsStack-prod' },
    ]);
    expect(prepared.request.stageDatabaseName).toBe('prod');
    expect(prepared.request.dropDatabaseOnDelete).toBe(false);
  });

  it('does not select prod when the branch is named prod', async () => {
    const lookup = recordingLookup([
      { OutputKey: 'AuroraClusterArn', OutputValue: 'arn:cluster' },
      { OutputKey: 'AuroraSecretArn', OutputValue: 'arn:secret' },
      { OutputKey: 'AuroraDatabaseName', OutputValue: 'feature_prod' },
    ]);

    await prepareStageDatabaseMigration({
      appStage: undefined,
      branch: 'prod',
      describeStack: lookup.describeStack,
      readParameter: lookup.readParameter,
      region: undefined,
    });

    expect(lookup.described).toEqual([
      { region: 'us-east-2', stackName: 'TanstackAwsStack-feature-prod' },
    ]);
  });

  it('refuses to migrate when HEAD is detached and APP_STAGE is absent', async () => {
    const lookup = recordingLookup();

    await expect(
      prepareStageDatabaseMigration({
        appStage: undefined,
        branch: 'HEAD',
        describeStack: lookup.describeStack,
        readParameter: lookup.readParameter,
        region: undefined,
      }),
    ).rejects.toThrow(/workload stack/);
    expect(lookup.described).toEqual([]);
  });
});
