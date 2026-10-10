import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { WORKLOAD_REGION } from '../../../lib/workload-region.ts';

export class AuroraConfigurationError extends Error {
  constructor() {
    super('Aurora settings are missing');
    this.name = 'AuroraConfigurationError';
  }
}

export type AuroraSettings = {
  clusterArn: string;
  databaseName: string;
  schema: string;
  secretArn: string;
};

const setting = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name]?.trim();
  if (!value) {
    throw new AuroraConfigurationError();
  }
  return value;
};

export const createStageDatabaseClient = (env: NodeJS.ProcessEnv = process.env): RDSDataClient =>
  new RDSDataClient({
    region: env.AWS_REGION?.trim() || WORKLOAD_REGION,
  });

export const readAuroraSettings = (env: NodeJS.ProcessEnv): AuroraSettings => ({
  clusterArn: setting(env, 'AURORA_CLUSTER_ARN'),
  databaseName: setting(env, 'AURORA_DATABASE_NAME'),
  schema: setting(env, 'AURORA_SCHEMA'),
  secretArn: setting(env, 'AURORA_SECRET_ARN'),
});
