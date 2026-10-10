export { migrateStageDatabaseSchema } from './stage-database-drizzle-migrate.ts';

export type AuroraDataApiStatement = {
  database: string;
  sql: string;
};

export type AuroraDataApiClient = {
  execute: (statement: AuroraDataApiStatement) => Promise<void>;
};

export type StageDatabaseMigrator = {
  migrate: (stageDatabaseName: string) => Promise<void>;
};

export type StageDatabaseLifecycleRequest = {
  dropDatabaseOnDelete: boolean;
  maintenanceDatabase: string;
  requestType: 'Create' | 'Update' | 'Delete';
  stageDatabaseName: string;
};

const DATABASE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

const quoteDatabase = (name: string): string => {
  if (!DATABASE_IDENTIFIER.test(name)) {
    throw new Error(`Invalid Aurora identifier: ${name}`);
  }
  return `"${name}"`;
};

const isAlreadyExists = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('already exists');
};

const executeStatement = async (
  client: AuroraDataApiClient,
  statement: AuroraDataApiStatement,
): Promise<void> => {
  try {
    await client.execute(statement);
  } catch (error) {
    const creatingDatabase = statement.sql.startsWith('CREATE DATABASE');
    if (creatingDatabase && isAlreadyExists(error)) {
      return;
    }
    throw error;
  }
};

export const applyStageDatabaseLifecycle = async (
  client: AuroraDataApiClient,
  request: StageDatabaseLifecycleRequest,
  migrator: StageDatabaseMigrator,
): Promise<void> => {
  quoteDatabase(request.maintenanceDatabase);
  const stageDatabase = quoteDatabase(request.stageDatabaseName);

  if (request.stageDatabaseName === request.maintenanceDatabase) {
    throw new Error(
      `Refusing to manage the maintenance database ${request.maintenanceDatabase} as a stage database.`,
    );
  }

  if (request.requestType === 'Delete') {
    if (!request.dropDatabaseOnDelete) {
      return;
    }
    await executeStatement(client, {
      database: request.maintenanceDatabase,
      sql: `DROP DATABASE IF EXISTS ${stageDatabase}`,
    });
    return;
  }

  await executeStatement(client, {
    database: request.maintenanceDatabase,
    sql: `CREATE DATABASE ${stageDatabase}`,
  });

  await migrator.migrate(request.stageDatabaseName);
};
