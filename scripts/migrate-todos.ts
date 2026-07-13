#!/usr/bin/env node
/* oxlint-disable no-console */
/**
 * One-time todos migration for permanent stages (main/prod).
 *
 * Copies legacy DynamoDB todos rows into the Blocks DistributedTable encoding.
 *
 * Usage:
 *   vp run migrate:todos -- --stage main
 *   vp run migrate:todos -- --stage prod
 *
 * Optional overrides:
 *   LEGACY_DDB_TODOS_TABLE_NAME  Retained legacy WebappDatabaseTodos table
 *   BLOCKS_DDB_TODOS_TABLE_NAME  BlocksBackend todos table (auto-derived by default)
 */

import { resolveStageName } from '../lib/stage-name.ts';
import { shouldMigrateStage } from './migrate-todos/resolve-table-names.ts';
import { runTodosMigration } from './migrate-todos/run-migration.ts';

type MigrateTodosCliOptions = {
  stageInput?: string;
};

const parseArgs = (argv: string[]): MigrateTodosCliOptions => {
  const options: MigrateTodosCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextArg = argv[index + 1];
    if (!nextArg) {
      continue;
    }

    if (arg === '--stage') {
      options.stageInput = nextArg;
      index += 1;
    }
  }

  return options;
};

const printBanner = (): void => {
  console.log('='.repeat(60));
  console.log('Todos migration (legacy DynamoDB → Blocks DistributedTable)');
  console.log('='.repeat(60));
};

const main = async (): Promise<void> => {
  printBanner();

  const options = parseArgs(process.argv.slice(2));
  const stageInput = options.stageInput ?? process.env.APP_STAGE;

  if (!stageInput) {
    console.error('Error: pass --stage <stage> or set APP_STAGE');
    process.exit(1);
  }

  const stage = resolveStageName(stageInput, {
    fallbackStage: 'dev',
    lifecycle: 'permanent',
  });

  if (!shouldMigrateStage(stage)) {
    console.log(
      `Ephemeral stage "${stage}" — migration skipped (permanent stages only: main, prod).`,
    );
    return;
  }

  console.log(`Stage: ${stage}`);
  console.log('');

  const result = await runTodosMigration(stage);

  console.log(`Legacy table: ${result.legacyTableName}`);
  console.log(`Blocks table: ${result.blocksTableName}`);
  console.log('');
  console.log(`Read:    ${result.counts.read}`);
  console.log(`Written: ${result.counts.written}`);
  console.log(`Skipped: ${result.counts.skipped}`);
  console.log('');
  console.log('='.repeat(60));
  console.log('Migration complete');
  console.log('='.repeat(60));
};

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
