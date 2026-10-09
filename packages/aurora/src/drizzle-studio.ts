import { createRequire } from 'node:module';
import path from 'node:path';
import type { WorkloadStageDatabase } from './stage-database-migrate.ts';

const require = createRequire(import.meta.url);

/** `drizzle-kit` does not export its CLI file. It sits beside the package entry. */
export const drizzleKitBinary = (): string =>
  path.join(path.dirname(require.resolve('drizzle-kit')), 'bin.cjs');

const drizzleConfigPath = 'packages/aurora/drizzle.config.ts';

export const drizzleKitSubcommands = ['generate', 'migrate', 'studio'] as const;

export type DrizzleKitSubcommand = (typeof drizzleKitSubcommands)[number];

export const drizzleKitCommand = (
  subcommand: DrizzleKitSubcommand,
  extraArgs: readonly string[] = [],
): { args: string[]; command: string } => ({
  args: [subcommand, '--config', drizzleConfigPath, ...extraArgs],
  command: 'drizzle-kit',
});

const isDrizzleKitSubcommand = (value: string | undefined): value is DrizzleKitSubcommand =>
  drizzleKitSubcommands.some((allowed) => allowed === value);

export const parseDrizzleKitCli = (
  argv: readonly string[],
): { extraArgs: string[]; subcommand: DrizzleKitSubcommand } => {
  const [subcommand, ...extraArgs] = argv;
  if (!isDrizzleKitSubcommand(subcommand)) {
    throw new Error('Expected drizzle-kit subcommand generate, migrate, or studio.');
  }
  return { extraArgs, subcommand };
};

export const drizzleStudioCommand = (): { args: string[]; command: string } =>
  drizzleKitCommand('studio');

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
