import type { RDSDataClient } from '@aws-sdk/client-rds-data';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { migrate } from 'drizzle-orm/aws-data-api/pg/migrator';

export type StageDatabaseSchemaMigration = {
  client: RDSDataClient;
  clusterArn: string;
  migrationsFolder: string;
  secretArn: string;
  stageDatabaseName: string;
};

export const migrateStageDatabaseSchema = async (
  input: StageDatabaseSchemaMigration,
): Promise<void> => {
  const database = drizzle({
    client: input.client,
    database: input.stageDatabaseName,
    resourceArn: input.clusterArn,
    secretArn: input.secretArn,
  });
  await migrate(database, { migrationsFolder: input.migrationsFolder });
};
