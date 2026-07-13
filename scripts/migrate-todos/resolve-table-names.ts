import { resolveStageLifecycle } from '../../lib/stage-name.ts';

const LEGACY_TABLE_ENV = 'LEGACY_DDB_TODOS_TABLE_NAME';
const BLOCKS_TABLE_ENV = 'BLOCKS_DDB_TODOS_TABLE_NAME';

export const stackNameForStage = (stage: string): string => `TanstackAwsStack-${stage}`;

export const blocksTodosTableNameForStage = (stage: string): string =>
  `${stackNameForStage(stage)}-BlocksBackend-tanstack-aws-todos-todos`;

export const legacyTodosTablePrefixForStage = (stage: string): string =>
  `${stackNameForStage(stage)}-WebappDatabaseTodos`;

export const shouldMigrateStage = (stage: string): boolean =>
  resolveStageLifecycle(stage) === 'permanent';

export const resolveBlocksTodosTableName = (stage: string): string =>
  process.env[BLOCKS_TABLE_ENV] ?? blocksTodosTableNameForStage(stage);

export const resolveLegacyTodosTableName = (
  stage: string,
  tableNames: readonly string[],
): string | null => {
  const override = process.env[LEGACY_TABLE_ENV];
  if (override) {
    return override;
  }

  const prefix = legacyTodosTablePrefixForStage(stage);
  const matches = tableNames.filter((name) => name.startsWith(prefix));

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    throw new Error(
      `Multiple legacy todos tables match prefix "${prefix}": ${matches.join(', ')}. Set ${LEGACY_TABLE_ENV}.`,
    );
  }

  return matches[0] ?? null;
};
