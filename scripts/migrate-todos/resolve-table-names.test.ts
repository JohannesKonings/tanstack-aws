import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  blocksTodosTableNameForStage,
  legacyTodosTablePrefixForStage,
  resolveBlocksTodosTableName,
  resolveLegacyTodosTableName,
  shouldMigrateStage,
  stackNameForStage,
} from './resolve-table-names.ts';

const originalLegacyEnv = process.env.LEGACY_DDB_TODOS_TABLE_NAME;
const originalBlocksEnv = process.env.BLOCKS_DDB_TODOS_TABLE_NAME;

afterEach(() => {
  if (originalLegacyEnv === undefined) {
    delete process.env.LEGACY_DDB_TODOS_TABLE_NAME;
  } else {
    process.env.LEGACY_DDB_TODOS_TABLE_NAME = originalLegacyEnv;
  }

  if (originalBlocksEnv === undefined) {
    delete process.env.BLOCKS_DDB_TODOS_TABLE_NAME;
  } else {
    process.env.BLOCKS_DDB_TODOS_TABLE_NAME = originalBlocksEnv;
  }
});

describe('shouldMigrateStage', () => {
  it('allows permanent stages', () => {
    expect(shouldMigrateStage('main')).toBe(true);
    expect(shouldMigrateStage('prod')).toBe(true);
  });

  it('skips ephemeral stages', () => {
    expect(shouldMigrateStage('feature-checkout')).toBe(false);
  });
});

describe('table name helpers', () => {
  it('builds stack and table prefixes from stage', () => {
    expect(stackNameForStage('main')).toBe('TanstackAwsStack-main');
    expect(blocksTodosTableNameForStage('main')).toBe(
      'TanstackAwsStack-main-BlocksBackend-tanstack-aws-todos-todos',
    );
    expect(legacyTodosTablePrefixForStage('main')).toBe(
      'TanstackAwsStack-main-WebappDatabaseTodos',
    );
  });
});

describe('resolveBlocksTodosTableName', () => {
  it('uses the Blocks table naming convention by default', () => {
    expect(resolveBlocksTodosTableName('prod')).toBe(
      'TanstackAwsStack-prod-BlocksBackend-tanstack-aws-todos-todos',
    );
  });

  it('honors BLOCKS_DDB_TODOS_TABLE_NAME override', () => {
    process.env.BLOCKS_DDB_TODOS_TABLE_NAME = 'custom-blocks-todos';
    expect(resolveBlocksTodosTableName('main')).toBe('custom-blocks-todos');
  });
});

describe('resolveLegacyTodosTableName', () => {
  it('honors LEGACY_DDB_TODOS_TABLE_NAME override', () => {
    process.env.LEGACY_DDB_TODOS_TABLE_NAME = 'legacy-todos-table';
    expect(resolveLegacyTodosTableName('main', [])).toBe('legacy-todos-table');
  });

  it('finds the retained legacy table by prefix', () => {
    const tableName = 'TanstackAwsStack-main-WebappDatabaseTodos39DA962E-ABC123';
    expect(resolveLegacyTodosTableName('main', [tableName, 'other-table'])).toBe(tableName);
  });

  it('returns null when no legacy table matches', () => {
    expect(resolveLegacyTodosTableName('main', ['unrelated-table'])).toBeNull();
  });

  it('throws when multiple legacy tables match', () => {
    expect(() =>
      resolveLegacyTodosTableName('main', [
        'TanstackAwsStack-main-WebappDatabaseTodos39DA962E-ONE',
        'TanstackAwsStack-main-WebappDatabaseTodos39DA962E-TWO',
      ]),
    ).toThrow(/Multiple legacy todos tables/);
  });
});
