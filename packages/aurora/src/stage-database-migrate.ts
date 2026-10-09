import { resolveWorkloadStack } from '@tanstack-aws/cdk-vite-plugin/workload-stack';
import { WORKLOAD_REGION } from '../../../lib/workload-region.ts';
import type { StageDatabaseLifecycleRequest } from './stage-database-lifecycle.ts';

export const MAINTENANCE_DATABASE_PARAMETER_NAME = '/tanstack-aws/shared/aurora/database-name';

const OUTPUT_KEYS = {
  clusterArn: 'AuroraClusterArn',
  secretArn: 'AuroraSecretArn',
  stageDatabaseName: 'AuroraDatabaseName',
} as const;

export type StackOutput = {
  OutputKey?: string;
  OutputValue?: string;
};

export type DescribeWorkloadStack = (input: {
  region: string;
  stackName: string;
}) => Promise<readonly StackOutput[]>;

export type WorkloadStageDatabase = {
  clusterArn: string;
  region: string;
  secretArn: string;
  stageDatabaseName: string;
};

export type ReadWorkloadStageDatabaseInput = {
  appStage: string | undefined;
  branch: string | undefined;
  describeStack: DescribeWorkloadStack;
  region: string | undefined;
};

export type PrepareStageDatabaseMigrationInput = ReadWorkloadStageDatabaseInput & {
  readParameter: (input: { name: string; region: string }) => Promise<string>;
};

export type PreparedStageDatabaseMigration = WorkloadStageDatabase & {
  request: StageDatabaseLifecycleRequest;
};

const configured = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const outputValue = (outputs: readonly StackOutput[], key: string, stackName: string): string => {
  const value = outputs.find((output) => output.OutputKey === key)?.OutputValue?.trim();
  if (!value) {
    throw new Error(`Workload stack ${stackName} is missing output ${key}.`);
  }
  return value;
};

export const workloadRegion = (region: string | undefined): string =>
  configured(region) ?? WORKLOAD_REGION;

export const readWorkloadStageDatabase = async (
  input: ReadWorkloadStageDatabaseInput,
): Promise<WorkloadStageDatabase> => {
  const resolved = resolveWorkloadStack({
    appStage: input.appStage,
    branch: input.branch,
  });
  if (!resolved) {
    throw new Error('Unable to resolve the workload stack. Set APP_STAGE or use a git branch.');
  }

  const region = workloadRegion(input.region);
  const outputs = await input.describeStack({ region, stackName: resolved.stackName });
  return {
    clusterArn: outputValue(outputs, OUTPUT_KEYS.clusterArn, resolved.stackName),
    region,
    secretArn: outputValue(outputs, OUTPUT_KEYS.secretArn, resolved.stackName),
    stageDatabaseName: outputValue(outputs, OUTPUT_KEYS.stageDatabaseName, resolved.stackName),
  };
};

export const prepareStageDatabaseMigration = async (
  input: PrepareStageDatabaseMigrationInput,
): Promise<PreparedStageDatabaseMigration> => {
  const stageDatabase = await readWorkloadStageDatabase(input);
  const maintenanceDatabase = (
    await input.readParameter({
      name: MAINTENANCE_DATABASE_PARAMETER_NAME,
      region: stageDatabase.region,
    })
  ).trim();
  if (!maintenanceDatabase) {
    throw new Error(`SSM parameter ${MAINTENANCE_DATABASE_PARAMETER_NAME} is empty.`);
  }

  return {
    ...stageDatabase,
    request: {
      dropDatabaseOnDelete: false,
      maintenanceDatabase,
      requestType: 'Create',
      stageDatabaseName: stageDatabase.stageDatabaseName,
    },
  };
};
