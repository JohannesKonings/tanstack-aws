import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RDSDataClient,
  RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data';
import { describe, expect, it } from 'vite-plus/test';
import { migrateStageDatabaseSchema } from './stage-database-drizzle-migrate.ts';

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), '../migrations');

class RecordingRdsDataClient extends RDSDataClient {
  readonly databases: string[] = [];
  readonly events: string[] = [];

  override send(command: {
    input?: { database?: string; sql?: string };
  }): Promise<{ columnMetadata: []; records: []; transactionId?: string }> {
    if (command.input?.database) {
      this.databases.push(command.input.database);
    }
    if (command instanceof BeginTransactionCommand) {
      this.events.push('begin');
      return Promise.resolve({ columnMetadata: [], records: [], transactionId: 'tx-1' });
    }
    if (command instanceof ExecuteStatementCommand) {
      this.events.push(command.input.sql ?? '');
      return Promise.resolve({ columnMetadata: [], records: [] });
    }
    if (
      command instanceof CommitTransactionCommand ||
      command instanceof RollbackTransactionCommand
    ) {
      this.events.push(command instanceof CommitTransactionCommand ? 'commit' : 'rollback');
      return Promise.resolve({ columnMetadata: [], records: [] });
    }
    return Promise.reject(new Error(`Unexpected RDS Data API command ${command.constructor.name}`));
  }
}

describe('stage database drizzle migrations', () => {
  it('applies packages/aurora migrations, including column changes, in one transaction', async () => {
    const client = new RecordingRdsDataClient({ region: 'us-east-2' });

    await migrateStageDatabaseSchema({
      client,
      clusterArn: 'arn:aws:rds:us-east-2:123456789012:cluster:tanstack',
      migrationsFolder,
      secretArn: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:tanstack',
      stageDatabaseName: 'feature_checkout',
    });

    const begin = client.events.indexOf('begin');
    const commit = client.events.indexOf('commit');
    const addColumn = client.events.findIndex((event) =>
      event.includes('ALTER TABLE "default"."contacts" ADD COLUMN "testjk" boolean NOT NULL'),
    );
    const dropColumn = client.events.findIndex((event) =>
      event.includes('ALTER TABLE "default"."contacts" DROP COLUMN "testjk"'),
    );

    expect(begin).toBeGreaterThanOrEqual(0);
    expect(addColumn).toBeGreaterThan(begin);
    expect(dropColumn).toBeGreaterThan(begin);
    expect(commit).toBeGreaterThan(addColumn);
    expect(commit).toBeGreaterThan(dropColumn);
    expect(client.databases.length).toBeGreaterThan(0);
    expect(client.databases.every((database) => database === 'feature_checkout')).toBe(true);
    expect(
      client.events
        .filter((event) => event !== 'begin' && event !== 'commit')
        .every((sql) => sql.trim().length > 0),
    ).toBe(true);
  });
});
