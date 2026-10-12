import { describe, expect, it } from 'vite-plus/test';
import {
  applyStageDatabaseLifecycle,
  type AuroraDataApiClient,
  type AuroraDataApiStatement,
  type StageDatabaseMigrator,
} from './stage-database-lifecycle.ts';

const MAINTENANCE_DATABASE = 'tanstackaws';
const FEATURE_DATABASE = 'feature_checkout';

const recordLifecycle = (): {
  client: AuroraDataApiClient;
  events: string[];
  migrator: StageDatabaseMigrator;
  statements: AuroraDataApiStatement[];
} => {
  const statements: AuroraDataApiStatement[] = [];
  const events: string[] = [];
  return {
    events,
    statements,
    client: {
      execute: async (statement) => {
        statements.push(statement);
        events.push(statement.sql);
      },
    },
    migrator: {
      migrate: async (stageDatabaseName) => {
        events.push(`migrate ${stageDatabaseName}`);
      },
    },
  };
};

describe('stage database lifecycle', () => {
  it('creates the stage database, then applies drizzle migrations to it', async () => {
    const { client, events, migrator, statements } = recordLifecycle();

    await applyStageDatabaseLifecycle(
      client,
      {
        dropDatabaseOnDelete: true,
        maintenanceDatabase: MAINTENANCE_DATABASE,
        requestType: 'Create',
        stageDatabaseName: FEATURE_DATABASE,
      },
      migrator,
    );

    expect(statements).toEqual([
      { database: MAINTENANCE_DATABASE, sql: 'CREATE DATABASE "feature_checkout"' },
    ]);
    expect(events).toEqual(['CREATE DATABASE "feature_checkout"', 'migrate feature_checkout']);
  });

  it('applies drizzle migrations when the stage database already exists', async () => {
    const events: string[] = [];
    const client: AuroraDataApiClient = {
      execute: async (statement) => {
        events.push(statement.sql);
        if (statement.sql.startsWith('CREATE DATABASE')) {
          throw new Error('database "feature_checkout" already exists');
        }
      },
    };
    const migrator: StageDatabaseMigrator = {
      migrate: async (stageDatabaseName) => {
        events.push(`migrate ${stageDatabaseName}`);
      },
    };

    await applyStageDatabaseLifecycle(
      client,
      {
        dropDatabaseOnDelete: true,
        maintenanceDatabase: MAINTENANCE_DATABASE,
        requestType: 'Update',
        stageDatabaseName: FEATURE_DATABASE,
      },
      migrator,
    );

    expect(events).toEqual(['CREATE DATABASE "feature_checkout"', 'migrate feature_checkout']);
  });

  it('drops the stage database when an ephemeral stack is deleted', async () => {
    const { client, migrator, statements } = recordLifecycle();

    await applyStageDatabaseLifecycle(
      client,
      {
        dropDatabaseOnDelete: true,
        maintenanceDatabase: MAINTENANCE_DATABASE,
        requestType: 'Delete',
        stageDatabaseName: FEATURE_DATABASE,
      },
      migrator,
    );

    expect(statements).toEqual([
      {
        database: MAINTENANCE_DATABASE,
        sql: 'DROP DATABASE IF EXISTS "feature_checkout"',
      },
    ]);
  });

  it('keeps the stage database when a permanent stage is deleted', async () => {
    const results = await Promise.all(
      ['main', 'prod'].map(async (stageDatabaseName) => {
        const recorded = recordLifecycle();
        await applyStageDatabaseLifecycle(
          recorded.client,
          {
            dropDatabaseOnDelete: false,
            maintenanceDatabase: MAINTENANCE_DATABASE,
            requestType: 'Delete',
            stageDatabaseName,
          },
          recorded.migrator,
        );
        return recorded.statements;
      }),
    );

    expect(results).toEqual([[], []]);
  });

  it('does not migrate when the stage database is deleted', async () => {
    const migrated: string[] = [];
    const client: AuroraDataApiClient = {
      execute: async () => undefined,
    };

    await applyStageDatabaseLifecycle(
      client,
      {
        dropDatabaseOnDelete: true,
        maintenanceDatabase: MAINTENANCE_DATABASE,
        requestType: 'Delete',
        stageDatabaseName: FEATURE_DATABASE,
      },
      {
        migrate: async (stageDatabaseName) => {
          migrated.push(stageDatabaseName);
        },
      },
    );

    expect(migrated).toEqual([]);
  });
});
