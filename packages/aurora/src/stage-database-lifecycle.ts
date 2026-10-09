import { STAGE_DATABASE_SCHEMA } from './stage-database-name.ts';

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export type AuroraDataApiStatement = {
  database: string;
  sql: string;
};

export type AuroraDataApiClient = {
  execute: (statement: AuroraDataApiStatement) => Promise<void>;
};

export type StageDatabaseLifecycleRequest = {
  dropDatabaseOnDelete: boolean;
  maintenanceDatabase: string;
  requestType: 'Create' | 'Update' | 'Delete';
  stageDatabaseName: string;
};

const quoteIdent = (name: string): string => {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`Invalid Aurora identifier: ${name}`);
  }
  return `"${name}"`;
};

const enumSql = (name: string, values: readonly string[]): string =>
  `DO $$ BEGIN CREATE TYPE "${STAGE_DATABASE_SCHEMA}"."${name}" AS ENUM (${values
    .map((value) => `'${value}'`)
    .join(', ')}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

const provisionStatements = (stageDatabaseName: string): AuroraDataApiStatement[] => {
  const onStage = (sql: string): AuroraDataApiStatement => ({
    database: stageDatabaseName,
    sql,
  });

  return [
    onStage(`CREATE SCHEMA IF NOT EXISTS "${STAGE_DATABASE_SCHEMA}"`),
    onStage(enumSql('gender', ['male', 'female', 'other', 'prefer_not_to_say'])),
    onStage(enumSql('address_type', ['home', 'work', 'billing', 'shipping'])),
    onStage(enumSql('account_type', ['checking', 'savings', 'investment'])),
    onStage(enumSql('contact_type', ['email', 'phone', 'mobile', 'linkedin', 'twitter'])),
    onStage(
      `CREATE TABLE IF NOT EXISTS "${STAGE_DATABASE_SCHEMA}"."persons" ("id" uuid PRIMARY KEY, "firstName" text NOT NULL, "lastName" text NOT NULL, "dateOfBirth" timestamptz, "gender" "${STAGE_DATABASE_SCHEMA}"."gender", "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL)`,
    ),
    onStage(
      `CREATE TABLE IF NOT EXISTS "${STAGE_DATABASE_SCHEMA}"."addresses" ("id" uuid PRIMARY KEY, "personId" uuid NOT NULL REFERENCES "${STAGE_DATABASE_SCHEMA}"."persons" ("id") ON DELETE CASCADE, "type" "${STAGE_DATABASE_SCHEMA}"."address_type" NOT NULL, "street" text NOT NULL, "city" text NOT NULL, "state" text NOT NULL, "postalCode" text NOT NULL, "country" text NOT NULL, "isPrimary" boolean NOT NULL)`,
    ),
    onStage(
      `CREATE TABLE IF NOT EXISTS "${STAGE_DATABASE_SCHEMA}"."bank_accounts" ("id" uuid PRIMARY KEY, "personId" uuid NOT NULL REFERENCES "${STAGE_DATABASE_SCHEMA}"."persons" ("id") ON DELETE CASCADE, "bankName" text NOT NULL, "accountType" "${STAGE_DATABASE_SCHEMA}"."account_type" NOT NULL, "accountNumberLast4" text NOT NULL, "iban" text, "bic" text, "isPrimary" boolean NOT NULL)`,
    ),
    onStage(
      `CREATE TABLE IF NOT EXISTS "${STAGE_DATABASE_SCHEMA}"."contacts" ("id" uuid PRIMARY KEY, "personId" uuid NOT NULL REFERENCES "${STAGE_DATABASE_SCHEMA}"."persons" ("id") ON DELETE CASCADE, "type" "${STAGE_DATABASE_SCHEMA}"."contact_type" NOT NULL, "value" text NOT NULL, "isPrimary" boolean NOT NULL, "isVerified" boolean NOT NULL)`,
    ),
    onStage(
      `CREATE TABLE IF NOT EXISTS "${STAGE_DATABASE_SCHEMA}"."employments" ("id" uuid PRIMARY KEY, "personId" uuid NOT NULL REFERENCES "${STAGE_DATABASE_SCHEMA}"."persons" ("id") ON DELETE CASCADE, "companyName" text NOT NULL, "position" text NOT NULL, "department" text, "startDate" timestamptz NOT NULL, "endDate" timestamptz, "isCurrent" boolean NOT NULL, "salary" numeric, "currency" text NOT NULL)`,
    ),
  ];
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
): Promise<void> => {
  quoteIdent(request.maintenanceDatabase);
  const stageDatabase = quoteIdent(request.stageDatabaseName);

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

  for (const statement of provisionStatements(request.stageDatabaseName)) {
    // Schema and tables must exist before the next statement runs.
    // oxlint-disable-next-line no-await-in-loop -- DDL is ordered, not parallel
    await executeStatement(client, statement);
  }
};
