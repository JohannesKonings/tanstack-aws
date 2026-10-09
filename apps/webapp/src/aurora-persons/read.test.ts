import type { ExecuteStatementCommandOutput } from '@aws-sdk/client-rds-data';
import { AuroraConfigurationError } from '@tanstack-aws/aurora';
import { describe, expect, it } from 'vite-plus/test';
import { readAuroraPersons, type StageDatabaseQueryClient } from './read.ts';

const settings = {
  AURORA_CLUSTER_ARN: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
  AURORA_DATABASE_NAME: 'feature_checkout',
  AURORA_SCHEMA: 'default',
  AURORA_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared',
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
      statements.push({
        database: command.input.database,
        resourceArn: command.input.resourceArn,
        secretArn: command.input.secretArn,
        sql: command.input.sql,
      });
      const result: ExecuteStatementCommandOutput = {
        $metadata: {},
        records: [],
      };
      return Promise.resolve(result);
    },
  };
  return { client, statements };
};

describe('Aurora persons reads', () => {
  it('loads the person list and each relation with a separate select', async () => {
    const { client, statements } = recordingClient();

    const rows = await readAuroraPersons(client, settings);

    expect(rows).toEqual({
      addresses: [],
      bankAccounts: [],
      contacts: [],
      employments: [],
      persons: [],
    });
    expect(statements.map((statement) => statement.sql).sort()).toEqual([
      'select "id", "firstName", "lastName", "gender"::text, "dateOfBirth"::text from "default"."persons"',
      'select "id", "personId", "bankName", "isPrimary", "accountType"::text, "accountNumberLast4", "iban", "bic" from "default"."bank_accounts"',
      'select "id", "personId", "position", "isCurrent", "companyName", "department", "startDate"::text, "endDate"::text, "salary"::text, "currency" from "default"."employments"',
      'select "id", "personId", "type"::text, "isPrimary", "isVerified", "value" from "default"."contacts"',
      'select "id", "personId", "type"::text, "isPrimary", "street", "city", "state", "postalCode", "country" from "default"."addresses"',
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

    await expect(readAuroraPersons(client, {})).rejects.toBeInstanceOf(AuroraConfigurationError);
    expect(statements).toEqual([]);
  });
});
