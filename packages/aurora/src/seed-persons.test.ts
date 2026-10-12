import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RDSDataClient,
  RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data';
import { describe, expect, it } from 'vite-plus/test';
import { buildSeedPersons, SEED_PERSON_COUNT, seedStageDatabase } from './seed-persons.ts';

const connection = {
  clusterArn: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
  secretArn: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared',
  stageDatabaseName: 'feature_checkout',
};

class RecordingRdsDataClient extends RDSDataClient {
  readonly databases: string[] = [];
  readonly events: string[] = [];
  readonly stringValues: string[] = [];

  override send(command: {
    input?: {
      database?: string;
      parameters?: { value?: { stringValue?: string } }[];
      sql?: string;
    };
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
      for (const parameter of command.input.parameters ?? []) {
        const value = parameter.value?.stringValue;
        if (value) {
          this.stringValues.push(value);
        }
      }
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

const rowsFor = <T extends { personId: string }>(rows: readonly T[], personId: string): T[] =>
  rows.filter((row) => row.personId === personId);

describe('stage database person seed', () => {
  it('builds 100 persons and detail rows that belong to them', () => {
    const graph = buildSeedPersons(SEED_PERSON_COUNT, '2026-01-15T12:00:00.000Z');
    const first = graph.persons[0];
    const last = graph.persons[99];

    expect(graph.persons).toHaveLength(100);
    expect(first).toMatchObject({
      createdAt: '2026-01-15T12:00:00.000Z',
      dateOfBirth: '1950-01-01T00:00:00.000Z',
      firstName: 'Ada',
      gender: 'female',
      lastName: 'Lovelace',
      updatedAt: '2026-01-15T12:00:00.000Z',
    });
    expect(last).toMatchObject({
      firstName: 'Jean',
      gender: 'prefer_not_to_say',
      lastName: 'Sammet',
    });
    expect(new Set(graph.persons.map((person) => person.id)).size).toBe(100);

    for (const person of graph.persons) {
      const addresses = rowsFor(graph.addresses, person.id);
      const bankAccounts = rowsFor(graph.bankAccounts, person.id);
      const contacts = rowsFor(graph.contacts, person.id);
      const employments = rowsFor(graph.employments, person.id);

      expect(addresses.filter((address) => address.isPrimary)).toHaveLength(1);
      expect(addresses[0]).toMatchObject({ isPrimary: true, type: 'home' });
      expect(bankAccounts.filter((account) => account.isPrimary)).toHaveLength(1);
      expect(bankAccounts[0]?.accountNumberLast4).toHaveLength(4);
      expect(
        contacts.filter((contact) => contact.isPrimary && contact.type === 'email'),
      ).toHaveLength(1);
      expect(employments.filter((employment) => employment.isCurrent)).toHaveLength(1);
      expect(employments[0]?.endDate).toBeNull();
    }

    expect(rowsFor(graph.addresses, first?.id ?? '')[0]).toMatchObject({
      city: 'London',
      country: 'United Kingdom',
      street: '12 Analytical Engine Road',
    });
    expect(rowsFor(graph.contacts, first?.id ?? '')[0]).toMatchObject({
      isVerified: true,
      type: 'email',
      value: 'ada.lovelace.0@example.com',
    });
    expect(rowsFor(graph.employments, first?.id ?? '')[0]).toMatchObject({
      companyName: 'Analytical Engines',
      currency: 'EUR',
      isCurrent: true,
      position: 'Mathematician',
      salary: 45_000,
    });
  });

  it('inserts the persons and their detail tables in one stage-database transaction', async () => {
    const client = new RecordingRdsDataClient({ region: 'us-east-2' });

    const seeded = await seedStageDatabase({
      client,
      clusterArn: connection.clusterArn,
      secretArn: connection.secretArn,
      stageDatabaseName: connection.stageDatabaseName,
    });

    const statements = client.events.filter((event) => event !== 'begin' && event !== 'commit');
    const sql = statements.join('\n');

    expect(seeded.persons).toBe(SEED_PERSON_COUNT);
    expect(seeded.addresses).toBeGreaterThan(SEED_PERSON_COUNT);
    expect(seeded.bankAccounts).toBeGreaterThanOrEqual(SEED_PERSON_COUNT);
    expect(seeded.contacts).toBeGreaterThan(SEED_PERSON_COUNT);
    expect(seeded.employments).toBeGreaterThan(SEED_PERSON_COUNT);
    expect(client.events[0]).toBe('begin');
    expect(client.events.at(-1)).toBe('commit');
    expect(client.events).not.toContain('rollback');
    expect(sql).toContain('insert into "default"."persons"');
    expect(sql).toContain('insert into "default"."addresses"');
    expect(sql).toContain('insert into "default"."bank_accounts"');
    expect(sql).toContain('insert into "default"."contacts"');
    expect(sql).toContain('insert into "default"."employments"');
    expect(sql.indexOf('"default"."persons"')).toBeLessThan(sql.indexOf('"default"."addresses"'));
    expect(sql).toContain('::"default"."gender"');
    expect(sql).toContain('::"default"."address_type"');
    expect(sql).toContain('::"default"."account_type"');
    expect(sql).toContain('::"default"."contact_type"');
    expect(sql).toContain('on conflict do nothing');
    expect(client.stringValues).toContain('ada.lovelace.0@example.com');
    expect(client.stringValues).toContain('Ada');
    expect(client.databases.length).toBeGreaterThan(0);
    expect(client.databases.every((database) => database === connection.stageDatabaseName)).toBe(
      true,
    );
  });
});
