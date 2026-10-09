import type { ExecuteStatementCommandOutput, SqlParameter } from '@aws-sdk/client-rds-data';
import { AuroraConfigurationError } from '@tanstack-aws/aurora';
import { describe, expect, it } from 'vite-plus/test';
import {
  type AuroraAddressWrite,
  type AuroraBankAccountWrite,
  type AuroraContactWrite,
  type AuroraEmploymentWrite,
  type AuroraPersonWrite,
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
  type StageDatabaseQueryClient,
  updateAuroraAddress,
  updateAuroraBankAccount,
  updateAuroraContact,
  updateAuroraEmployment,
  updateAuroraPerson,
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

const booleanParameter = (name: string, value: boolean): SqlParameter => ({
  name,
  value: { booleanValue: value },
});

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
    await expect(
      createAuroraAddress(
        client,
        {},
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          personId,
          type: 'home',
          street: '12 St James',
          city: 'London',
          state: 'England',
          postalCode: 'SW1A 1AA',
          country: 'UK',
          isPrimary: true,
        },
      ),
    ).rejects.toBeInstanceOf(AuroraConfigurationError);
    await expect(
      createAuroraContact(
        client,
        {},
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          personId,
          type: 'email',
          value: 'ada@example.com',
          isPrimary: true,
          isVerified: false,
        },
      ),
    ).rejects.toBeInstanceOf(AuroraConfigurationError);
    await expect(
      createAuroraBankAccount(
        client,
        {},
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          personId,
          bankName: 'Barings',
          accountType: 'checking',
          accountNumberLast4: '4242',
          iban: null,
          bic: null,
          isPrimary: false,
        },
      ),
    ).rejects.toBeInstanceOf(AuroraConfigurationError);
    await expect(
      createAuroraEmployment(
        client,
        {},
        {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          personId,
          companyName: 'Analytical Engines',
          position: 'Mathematician',
          department: null,
          startDate: '1843-01-01T00:00:00.000Z',
          endDate: null,
          isCurrent: true,
          salary: null,
          currency: 'GBP',
        },
      ),
    ).rejects.toBeInstanceOf(AuroraConfigurationError);
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

  it('creates, updates, and deletes an address', async () => {
    const { client, statements } = recordingClient();
    const addressId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const created: AuroraAddressWrite = {
      id: addressId,
      personId,
      type: 'home',
      street: '12 St James',
      city: 'London',
      state: 'England',
      postalCode: 'SW1A 1AA',
      country: 'UK',
      isPrimary: true,
    };
    const updated: AuroraAddressWrite = {
      ...created,
      type: 'work',
      street: '1 Analytical Engine',
      postalCode: 'SW1A 2AA',
      isPrimary: false,
    };

    await createAuroraAddress(client, settings, created);
    await updateAuroraAddress(client, settings, updated);
    await deleteAuroraAddress(client, settings, addressId);

    expect(statements).toEqual([
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', addressId),
          stringParameter('2', personId),
          stringParameter('3', 'home'),
          stringParameter('4', '12 St James'),
          stringParameter('5', 'London'),
          stringParameter('6', 'England'),
          stringParameter('7', 'SW1A 1AA'),
          stringParameter('8', 'UK'),
          booleanParameter('9', true),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'insert into "default"."addresses" ("id", "personId", "type", "street", "city", "state", "postalCode", "country", "isPrimary") values (:1::uuid, :2::uuid, :3::"default"."address_type", :4::text, :5::text, :6::text, :7::text, :8::text, :9::boolean)',
      },
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', 'work'),
          stringParameter('2', '1 Analytical Engine'),
          stringParameter('3', 'London'),
          stringParameter('4', 'England'),
          stringParameter('5', 'SW1A 2AA'),
          stringParameter('6', 'UK'),
          booleanParameter('7', false),
          stringParameter('8', addressId),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'update "default"."addresses" set "type" = :1::"default"."address_type", "street" = :2::text, "city" = :3::text, "state" = :4::text, "postalCode" = :5::text, "country" = :6::text, "isPrimary" = :7::boolean where "default"."addresses"."id" = :8::uuid',
      },
      {
        database: 'feature_checkout',
        parameters: [stringParameter('1', addressId)],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'delete from "default"."addresses" where "default"."addresses"."id" = :1::uuid',
      },
    ]);
  });

  it('creates, updates, and deletes a contact', async () => {
    const { client, statements } = recordingClient();
    const contactId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const created: AuroraContactWrite = {
      id: contactId,
      personId,
      type: 'email',
      value: 'ada@example.com',
      isPrimary: true,
      isVerified: false,
    };
    const updated: AuroraContactWrite = {
      ...created,
      value: 'ada@analytical.example',
      isPrimary: false,
      isVerified: true,
    };

    await createAuroraContact(client, settings, created);
    await updateAuroraContact(client, settings, updated);
    await deleteAuroraContact(client, settings, contactId);

    expect(statements).toEqual([
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', contactId),
          stringParameter('2', personId),
          stringParameter('3', 'email'),
          stringParameter('4', 'ada@example.com'),
          booleanParameter('5', true),
          booleanParameter('6', false),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'insert into "default"."contacts" ("id", "personId", "type", "value", "isPrimary", "isVerified") values (:1::uuid, :2::uuid, :3::"default"."contact_type", :4::text, :5::boolean, :6::boolean)',
      },
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', 'email'),
          stringParameter('2', 'ada@analytical.example'),
          booleanParameter('3', false),
          booleanParameter('4', true),
          stringParameter('5', contactId),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'update "default"."contacts" set "type" = :1::"default"."contact_type", "value" = :2::text, "isPrimary" = :3::boolean, "isVerified" = :4::boolean where "default"."contacts"."id" = :5::uuid',
      },
      {
        database: 'feature_checkout',
        parameters: [stringParameter('1', contactId)],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'delete from "default"."contacts" where "default"."contacts"."id" = :1::uuid',
      },
    ]);
  });

  it('creates, updates, and deletes a bank account', async () => {
    const { client, statements } = recordingClient();
    const bankAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const created: AuroraBankAccountWrite = {
      id: bankAccountId,
      personId,
      bankName: 'Barings',
      accountType: 'checking',
      accountNumberLast4: '4242',
      iban: 'GB82WEST12345698765432',
      bic: 'WESTGB2L',
      isPrimary: true,
    };
    const updated: AuroraBankAccountWrite = {
      ...created,
      bankName: 'Coutts',
      accountType: 'savings',
      accountNumberLast4: '9999',
      iban: null,
      bic: null,
      isPrimary: false,
    };

    await createAuroraBankAccount(client, settings, created);
    await updateAuroraBankAccount(client, settings, updated);
    await deleteAuroraBankAccount(client, settings, bankAccountId);

    expect(statements).toEqual([
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', bankAccountId),
          stringParameter('2', personId),
          stringParameter('3', 'Barings'),
          stringParameter('4', 'checking'),
          stringParameter('5', '4242'),
          stringParameter('6', 'GB82WEST12345698765432'),
          stringParameter('7', 'WESTGB2L'),
          booleanParameter('8', true),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'insert into "default"."bank_accounts" ("id", "personId", "bankName", "accountType", "accountNumberLast4", "iban", "bic", "isPrimary") values (:1::uuid, :2::uuid, :3::text, :4::"default"."account_type", :5::text, :6::text, :7::text, :8::boolean)',
      },
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', 'Coutts'),
          stringParameter('2', 'savings'),
          stringParameter('3', '9999'),
          nullParameter('4'),
          nullParameter('5'),
          booleanParameter('6', false),
          stringParameter('7', bankAccountId),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'update "default"."bank_accounts" set "bankName" = :1::text, "accountType" = :2::"default"."account_type", "accountNumberLast4" = :3::text, "iban" = :4::text, "bic" = :5::text, "isPrimary" = :6::boolean where "default"."bank_accounts"."id" = :7::uuid',
      },
      {
        database: 'feature_checkout',
        parameters: [stringParameter('1', bankAccountId)],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'delete from "default"."bank_accounts" where "default"."bank_accounts"."id" = :1::uuid',
      },
    ]);
  });

  it('creates, updates, and deletes employment', async () => {
    const { client, statements } = recordingClient();
    const employmentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const created: AuroraEmploymentWrite = {
      id: employmentId,
      personId,
      companyName: 'Analytical Engines',
      position: 'Mathematician',
      department: 'Research',
      startDate: '1843-01-01T00:00:00.000Z',
      endDate: null,
      isCurrent: true,
      salary: 1200,
      currency: 'GBP',
    };
    const updated: AuroraEmploymentWrite = {
      ...created,
      companyName: 'Analytical Engines Ltd',
      position: 'Author',
      department: null,
      endDate: '1852-11-27T00:00:00.000Z',
      isCurrent: false,
      salary: 1500.5,
    };

    await createAuroraEmployment(client, settings, created);
    await updateAuroraEmployment(client, settings, updated);
    await deleteAuroraEmployment(client, settings, employmentId);

    expect(statements).toEqual([
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', employmentId),
          stringParameter('2', personId),
          stringParameter('3', 'Analytical Engines'),
          stringParameter('4', 'Mathematician'),
          stringParameter('5', 'Research'),
          stringParameter('6', '1843-01-01T00:00:00.000Z'),
          nullParameter('7'),
          booleanParameter('8', true),
          stringParameter('9', '1200'),
          stringParameter('10', 'GBP'),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'insert into "default"."employments" ("id", "personId", "companyName", "position", "department", "startDate", "endDate", "isCurrent", "salary", "currency") values (:1::uuid, :2::uuid, :3::text, :4::text, :5::text, :6::timestamptz, :7::timestamptz, :8::boolean, :9::numeric, :10::text)',
      },
      {
        database: 'feature_checkout',
        parameters: [
          stringParameter('1', 'Analytical Engines Ltd'),
          stringParameter('2', 'Author'),
          nullParameter('3'),
          stringParameter('4', '1843-01-01T00:00:00.000Z'),
          stringParameter('5', '1852-11-27T00:00:00.000Z'),
          booleanParameter('6', false),
          stringParameter('7', '1500.5'),
          stringParameter('8', 'GBP'),
          stringParameter('9', employmentId),
        ],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'update "default"."employments" set "companyName" = :1::text, "position" = :2::text, "department" = :3::text, "startDate" = :4::timestamptz, "endDate" = :5::timestamptz, "isCurrent" = :6::boolean, "salary" = :7::numeric, "currency" = :8::text where "default"."employments"."id" = :9::uuid',
      },
      {
        database: 'feature_checkout',
        parameters: [stringParameter('1', employmentId)],
        resourceArn: settings.AURORA_CLUSTER_ARN,
        secretArn: settings.AURORA_SECRET_ARN,
        sql: 'delete from "default"."employments" where "default"."employments"."id" = :1::uuid',
      },
    ]);
  });
});
