import type { ExecuteStatementCommandOutput } from '@aws-sdk/client-rds-data';
import { AuroraConfigurationError } from '@tanstack-aws/aurora';
import { describe, expect, it } from 'vite-plus/test';
import { countStageDatabaseTables, type StageDatabaseQueryClient } from './counts.ts';

const settings = {
  AURORA_CLUSTER_ARN: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
  AURORA_DATABASE_NAME: 'feature_checkout',
  AURORA_SCHEMA: 'default',
  AURORA_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared',
};

const countBySql: Record<string, number> = {
  'select count(*) from "default"."addresses"': 2,
  'select count(*) from "default"."bank_accounts"': 0,
  'select count(*) from "default"."contacts"': 7,
  'select count(*) from "default"."employments"': 1,
  'select count(*) from "default"."persons"': 4,
};

const recordingClient = (): {
  client: StageDatabaseQueryClient;
  statements: { database?: string; resourceArn?: string; secretArn?: string; sql?: string }[];
} => {
  const statements: {
    database?: string;
    resourceArn?: string;
    secretArn?: string;
    sql?: string;
  }[] = [];
  const client: StageDatabaseQueryClient = {
    send: (command) => {
      const sql = command.input.sql;
      statements.push({
        database: command.input.database,
        resourceArn: command.input.resourceArn,
        secretArn: command.input.secretArn,
        sql,
      });
      const count = sql === undefined ? undefined : countBySql[sql];
      if (count === undefined) {
        throw new Error(`Unexpected count statement: ${sql}`);
      }
      const result: ExecuteStatementCommandOutput = {
        $metadata: {},
        columnMetadata: [{ name: 'count' }],
        records: [[{ longValue: count }]],
      };
      return Promise.resolve(result);
    },
  };
  return { client, statements };
};

describe('stage database counts', () => {
  it('counts the five person tables in schema default', async () => {
    const { client, statements } = recordingClient();

    const counts = await countStageDatabaseTables(client, settings);

    expect(counts).toEqual({
      addresses: 2,
      bankAccounts: 0,
      contacts: 7,
      employments: 1,
      persons: 4,
    });
    expect(statements.map((statement) => statement.sql).sort()).toEqual([
      'select count(*) from "default"."addresses"',
      'select count(*) from "default"."bank_accounts"',
      'select count(*) from "default"."contacts"',
      'select count(*) from "default"."employments"',
      'select count(*) from "default"."persons"',
    ]);
    expect(statements.every((statement) => statement.database === 'feature_checkout')).toBe(true);
    expect(
      statements.every(
        (statement) =>
          statement.resourceArn === settings.AURORA_CLUSTER_ARN &&
          statement.secretArn === settings.AURORA_SECRET_ARN,
      ),
    ).toBe(true);
  });

  it('reports a configuration error when Aurora settings are missing', async () => {
    const { client, statements } = recordingClient();

    await expect(countStageDatabaseTables(client, {})).rejects.toBeInstanceOf(
      AuroraConfigurationError,
    );
    expect(statements).toEqual([]);
  });
});
