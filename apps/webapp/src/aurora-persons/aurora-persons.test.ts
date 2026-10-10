import type { ExecuteStatementCommandOutput, SqlParameter } from '@aws-sdk/client-rds-data';
import { AuroraConfigurationError } from '@tanstack-aws/aurora';
import { describe, expect, it } from 'vite-plus/test';
import {
  createAuroraAddress,
  createAuroraBankAccount,
  createAuroraContact,
  createAuroraEmployment,
  createAuroraPerson,
  deleteAuroraAddress,
  deleteAuroraBankAccount,
  deleteAuroraContact,
  deleteAuroraEmployment,
  deleteAuroraPerson,
  readAuroraPersons,
  type StageDatabaseQueryClient,
  updateAuroraAddress,
  updateAuroraBankAccount,
  updateAuroraContact,
  updateAuroraEmployment,
  updateAuroraPerson,
} from './aurora-persons.ts';

const settings = {
  AURORA_CLUSTER_ARN: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
  AURORA_DATABASE_NAME: 'feature_checkout',
  AURORA_SCHEMA: 'default',
  AURORA_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared',
};

const personId = '11111111-1111-4111-8111-111111111111';

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

const tableOf = (sql: string | undefined) => sql?.match(/"default"\."([a-z_]+)"/)?.[1];

const usesStageDatabase = (statement: RecordedStatement) =>
  statement.database === 'feature_checkout' &&
  statement.resourceArn === settings.AURORA_CLUSTER_ARN &&
  statement.secretArn === settings.AURORA_SECRET_ARN;

const parameterValues = (statement: RecordedStatement | undefined) =>
  statement?.parameters?.map((parameter) => parameter.value) ?? [];

describe('Aurora persons', () => {
  it('loads an empty page from the five stage database tables', async () => {
    const { client, statements } = recordingClient();

    const rows = await readAuroraPersons(client, settings);

    expect(rows).toEqual({
      addresses: [],
      bankAccounts: [],
      contacts: [],
      employments: [],
      persons: [],
    });
    expect(statements.map((statement) => tableOf(statement.sql)).sort()).toEqual([
      'addresses',
      'bank_accounts',
      'contacts',
      'employments',
      'persons',
    ]);
    expect(statements.every((statement) => statement.sql?.startsWith('select '))).toBe(true);
    expect(statements.every(usesStageDatabase)).toBe(true);
  });

  it('writes a person with both timestamps and a schema-qualified gender cast', async () => {
    const { client, statements } = recordingClient();

    await createAuroraPerson(client, settings, {
      id: personId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '1815-12-10T00:00:00.000Z',
      gender: 'female',
    });

    expect(statements).toHaveLength(1);
    expect(tableOf(statements[0]?.sql)).toBe('persons');
    expect(statements[0]?.sql).toContain('insert into "default"."persons"');
    expect(statements[0]?.sql).toContain('"createdAt"');
    expect(statements[0]?.sql).toContain('"updatedAt"');
    expect(statements[0]?.sql).toContain('::"default"."gender"');
    expect(parameterValues(statements[0])).toContainEqual({ stringValue: 'female' });
    expect(statements.every(usesStageDatabase)).toBe(true);
  });

  it('stores a blank date of birth and an omitted gender as null', async () => {
    const { client, statements } = recordingClient();

    await createAuroraPerson(client, settings, {
      id: personId,
      firstName: 'Alan',
      lastName: 'Turing',
      dateOfBirth: '   ',
    });

    const values = parameterValues(statements[0]);
    expect(values).toContainEqual({ isNull: true });
    expect(values).not.toContainEqual({ stringValue: '   ' });
  });

  it('updates a person without rewriting createdAt', async () => {
    const { client, statements } = recordingClient();

    await updateAuroraPerson(client, settings, {
      id: personId,
      firstName: 'Augusta',
      lastName: 'Lovelace',
      dateOfBirth: '1815-12-10T00:00:00.000Z',
      gender: 'female',
    });

    expect(tableOf(statements[0]?.sql)).toBe('persons');
    expect(statements[0]?.sql).toContain('update "default"."persons"');
    expect(statements[0]?.sql).toContain('"updatedAt"');
    expect(statements[0]?.sql).not.toContain('"createdAt"');
  });

  it('deletes related rows before the person', async () => {
    const { client, statements } = recordingClient();

    await deleteAuroraPerson(client, settings, personId);

    expect(statements.map((statement) => tableOf(statement.sql))).toEqual([
      'addresses',
      'contacts',
      'bank_accounts',
      'employments',
      'persons',
    ]);
    expect(statements.every((statement) => statement.sql?.startsWith('delete from'))).toBe(true);
  });

  it('creates, updates, and deletes an address', async () => {
    const { client, statements } = recordingClient();
    const addressId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const address = {
      id: addressId,
      personId,
      type: 'home' as const,
      street: '12 St James',
      city: 'London',
      state: 'England',
      postalCode: 'SW1A 1AA',
      country: 'UK',
      isPrimary: true,
    };

    await createAuroraAddress(client, settings, address);
    await updateAuroraAddress(client, settings, { ...address, type: 'work', isPrimary: false });
    await deleteAuroraAddress(client, settings, addressId);

    expect(statements.map((statement) => statement.sql?.split(' ')[0])).toEqual([
      'insert',
      'update',
      'delete',
    ]);
    expect(statements.every((statement) => tableOf(statement.sql) === 'addresses')).toBe(true);
    expect(statements[0]?.sql).toContain('::"default"."address_type"');
  });

  it('creates, updates, and deletes a contact', async () => {
    const { client, statements } = recordingClient();
    const contactId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const contact = {
      id: contactId,
      personId,
      type: 'email' as const,
      value: 'ada@example.com',
      isPrimary: true,
      isVerified: false,
    };

    await createAuroraContact(client, settings, contact);
    await updateAuroraContact(client, settings, { ...contact, isVerified: true });
    await deleteAuroraContact(client, settings, contactId);

    expect(statements.map((statement) => statement.sql?.split(' ')[0])).toEqual([
      'insert',
      'update',
      'delete',
    ]);
    expect(statements.every((statement) => tableOf(statement.sql) === 'contacts')).toBe(true);
    expect(statements[0]?.sql).toContain('::"default"."contact_type"');
  });

  it('stores a blank bank account iban as null', async () => {
    const { client, statements } = recordingClient();
    const bankAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    await createAuroraBankAccount(client, settings, {
      id: bankAccountId,
      personId,
      bankName: 'Barings',
      accountType: 'checking',
      accountNumberLast4: '4242',
      iban: '  ',
      bic: '',
      isPrimary: true,
    });
    await updateAuroraBankAccount(client, settings, {
      id: bankAccountId,
      personId,
      bankName: 'Coutts',
      accountType: 'savings',
      accountNumberLast4: '9999',
      isPrimary: false,
    });
    await deleteAuroraBankAccount(client, settings, bankAccountId);

    expect(statements.map((statement) => tableOf(statement.sql))).toEqual([
      'bank_accounts',
      'bank_accounts',
      'bank_accounts',
    ]);
    expect(parameterValues(statements[0])).toContainEqual({ isNull: true });
    expect(parameterValues(statements[0])).not.toContainEqual({ stringValue: '  ' });
    expect(statements[0]?.sql).toContain('::"default"."account_type"');
  });

  it('stores a blank employment department as null', async () => {
    const { client, statements } = recordingClient();
    const employmentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const employment = {
      id: employmentId,
      personId,
      companyName: 'Analytical Engines',
      position: 'Mathematician',
      startDate: '1843-01-01T00:00:00.000Z',
      isCurrent: true,
      currency: 'GBP',
    };

    await createAuroraEmployment(client, settings, { ...employment, department: '  ' });
    await updateAuroraEmployment(client, settings, {
      ...employment,
      department: 'Research',
      endDate: '1852-11-27T00:00:00.000Z',
      isCurrent: false,
      salary: 1500.5,
    });
    await deleteAuroraEmployment(client, settings, employmentId);

    expect(statements.map((statement) => tableOf(statement.sql))).toEqual([
      'employments',
      'employments',
      'employments',
    ]);
    expect(parameterValues(statements[0])).toContainEqual({ isNull: true });
    expect(parameterValues(statements[0])).not.toContainEqual({ stringValue: '  ' });
  });

  it('reports a configuration error and sends no SQL when Aurora settings are missing', async () => {
    const { client, statements } = recordingClient();

    await expect(readAuroraPersons(client, {})).rejects.toBeInstanceOf(AuroraConfigurationError);
    await expect(
      createAuroraPerson(client, {}, { id: personId, firstName: 'Ada', lastName: 'Lovelace' }),
    ).rejects.toBeInstanceOf(AuroraConfigurationError);
    expect(statements).toEqual([]);
  });
});
