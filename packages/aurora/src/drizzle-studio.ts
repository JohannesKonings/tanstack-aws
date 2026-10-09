import { createRequire } from 'node:module';
import path from 'node:path';
import type { WorkloadStageDatabase } from './stage-database-migrate.ts';

const require = createRequire(import.meta.url);

/** `drizzle-kit` does not export its CLI file. It sits beside the package entry. */
export const drizzleKitBinary = (): string =>
  path.join(path.dirname(require.resolve('drizzle-kit')), 'bin.cjs');

export const drizzleStudioCommand = (): { args: string[]; command: string } => ({
  args: ['studio', '--config', 'packages/aurora/drizzle.config.ts'],
  command: 'drizzle-kit',
});

export const studioEnvironment = (
  base: NodeJS.ProcessEnv,
  connection: WorkloadStageDatabase,
): NodeJS.ProcessEnv => ({
  ...base,
  AURORA_CLUSTER_ARN: connection.clusterArn,
  AURORA_DATABASE_NAME: connection.stageDatabaseName,
  AURORA_SECRET_ARN: connection.secretArn,
  AWS_REGION: connection.region,
});
