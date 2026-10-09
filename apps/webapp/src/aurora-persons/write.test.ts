import type { ExecuteStatementCommandOutput, SqlParameter } from '@aws-sdk/client-rds-data';
import { AuroraConfigurationError } from '@tanstack-aws/aurora';
import { describe, expect, it } from 'vite-plus/test';
import {
  createAuroraPerson,
  deleteAuroraPerson,
  updateAuroraPerson,
  type AuroraPersonWrite,
  type StageDatabaseQueryClient,
} from './write.ts';

const settings = {
  AURORA_CLUSTER_ARN: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
  AURORA_DATABASE_NAME: 'feature_checkout',
  AURORA_SCHEMA: 'default',
  AURORA_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared',
};

const personId = '11111111-1111-4111-8111-111111111111';
const writtenAt = '2026-01-02T03:04:05.000Z';
const dateOfBirth = '1815-12-10T00:00:00.000Z';

type RecordedStatement = {
  database?: string;
  parameters?: SqlParameter[];
  resourceArn?: string;
  secretArn?: string;
  sql?: string;
};

const recordingClient = (): {
  client: StageDatabaseQueryClient;
  statements: RecordedStatement[];
} => {
  const statements: RecordedStatement[] = [];
  const client: StageDatabaseQueryClient = {
    send: (command) => {
      statements.push({
        database: command.input.database,
        parameters: command.input.parameters,
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

const stringParameter = (name: string, value: string): SqlParameter => ({
  name,
  value: { stringValue: value },
});

const nullParameter = (name: string): SqlParameter => ({
  name,
  value: { isNull: true },
});

describe('Aurora persons writes', () => {
  it('creates a person and sets createdAt and updatedAt', async () => {
    const { client, statements } = recordingClient();

    await createAuroraPerson(
      client,
      settings,
      {
        id: personId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth,
        gender: 'female',
      },
      writtenAt,
    );

    expect(statements).toEqual([
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', personId),
          stringParameter('2', 'Ada'),
          stringParameter('3', 'Lovelace'),
          stringParameter('4', dateOfBirth),
          stringParameter('5', 'female'),
          stringParameter('6', writtenAt),
          stringParameter('7', writtenAt),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'insert into "default"."persons" ("id", "firstName", "lastName", "dateOfBirth", "gender", "createdAt", "updatedAt") values (:1::uuid, :2::text, :3::text, :4::timestamptz, :5::"default"."gender", :6::timestamptz, :7::timestamptz)',
      },
    ]);
  });

  it('creates a person when date of birth and gender are empty', async () => {
    const { client, statements } = recordingClient();

    await createAuroraPerson(
      client,
      settings,
      {
        id: personId,
        firstName: 'Alan',
        lastName: 'Turing',
        dateOfBirth: null,
        gender: null,
      },
      writtenAt,
    );

    expect(statements).toEqual([
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', personId),
          stringParameter('2', 'Alan'),
          stringParameter('3', 'Turing'),
          nullParameter('4'),
          nullParameter('5'),
          stringParameter('6', writtenAt),
          stringParameter('7', writtenAt),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'insert into "default"."persons" ("id", "firstName", "lastName", "dateOfBirth", "gender", "createdAt", "updatedAt") values (:1::uuid, :2::text, :3::text, :4::timestamptz, :5::"default"."gender", :6::timestamptz, :7::timestamptz)',
      },
    ]);
  });

  it('reports a configuration error when Aurora settings are missing and sends no SQL', async () => {
    const { client, statements } = recordingClient();

    const person: AuroraPersonWrite = {
      id: personId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: null,
      gender: null,
    };

    await expect(createAuroraPerson(client, {}, person, writtenAt)).rejects.toBeInstanceOf(
      AuroraConfigurationError,
    );
    await expect(updateAuroraPerson(client, {}, person, writtenAt)).rejects.toBeInstanceOf(
      AuroraConfigurationError,
    );
    await expect(deleteAuroraPerson(client, {}, personId)).rejects.toBeInstanceOf(
      AuroraConfigurationError,
    );
    expect(statements).toEqual([]);
  });

  it('updates a person and sets updatedAt without changing createdAt', async () => {
    const { client, statements } = recordingClient();

    await updateAuroraPerson(
      client,
      settings,
      {
        id: personId,
        firstName: 'Augusta',
        lastName: 'Lovelace',
        dateOfBirth,
        gender: 'female',
      },
      writtenAt,
    );

    expect(statements).toEqual([
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', 'Augusta'),
          stringParameter('2', 'Lovelace'),
          stringParameter('3', dateOfBirth),
          stringParameter('4', 'female'),
          stringParameter('5', writtenAt),
          stringParameter('6', personId),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'update "default"."persons" set "firstName" = :1::text, "lastName" = :2::text, "dateOfBirth" = :3::timestamptz, "gender" = :4::"default"."gender", "updatedAt" = :5::timestamptz where "default"."persons"."id" = :6::uuid',
      },
    ]);
  });

  it('deletes a person and the related addresses, contacts, bank accounts, and employment', async () => {
    const { client, statements } = recordingClient();

    await deleteAuroraPerson(client, settings, personId);

    const relatedDelete = (table: string) => ({
      database: 'feature_checkout',
      parameters: [stringParameter('1', personId)],
      resourceArn: settings.AURORA_CLUSTER_ARN,
      secretArn: settings.AURORA_SECRET_ARN,
      sql: `delete from "default"."${table}" where "default"."${table}"."personId" = :1::uuid`,
    });

    expect(statements).toEqual([
      relatedDelete('addresses'),
      relatedDelete('contacts'),
      relatedDelete('bank_accounts'),
      relatedDelete('employments'),
      {
        database: 'feature_checkout',
        parameters: [stringParameter('1', personId)],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'delete from "default"."persons" where "default"."persons"."id" = :1::uuid',
      },
    ]);
  });
});
