import { getTableConfig, type PgColumn, PgEnumColumn } from 'drizzle-orm/pg-core';
import { stageDatabaseTables } from './person-schema.ts';

const DATABASE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const SCHEMA_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

const quoteDatabase = (name: string): string => {
  if (!DATABASE_IDENTIFIER.test(name)) {
    throw new Error(`Invalid Aurora identifier: ${name}`);
  }
  return `"${name}"`;
};

const quoteSchemaIdent = (name: string): string => {
  if (!SCHEMA_IDENTIFIER.test(name)) {
    throw new Error(`Invalid Aurora identifier: ${name}`);
  }
  return `"${name}"`;
};

const quoteLiteral = (value: string): string => {
  if (!SCHEMA_IDENTIFIER.test(value)) {
    throw new Error(`Invalid Aurora enum value: ${value}`);
  }
  return `'${value}'`;
};

const deleteActionSql = (action: string): string => action.toUpperCase();

const columnSqlType = (column: PgColumn): string => {
  if (column instanceof PgEnumColumn) {
    const schema = column.enum.schema;
    const name = quoteSchemaIdent(column.enum.enumName);
    return schema ? `${quoteSchemaIdent(schema)}.${name}` : name;
  }
  return column.getSQLType();
};

const enumStatements = (database: string): AuroraDataApiStatement[] => {
  const seen = new Set<string>();
  const statements: AuroraDataApiStatement[] = [];

  for (const table of stageDatabaseTables) {
    for (const column of getTableConfig(table).columns) {
      if (!(column instanceof PgEnumColumn)) {
        continue;
      }
      const schema = column.enum.schema;
      if (!schema) {
        throw new Error(`Enum ${column.enum.enumName} has no schema.`);
      }
      const key = `${schema}.${column.enum.enumName}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const enumValues: readonly string[] = column.enum.enumValues;
      const values = enumValues.map((value) => quoteLiteral(value)).join(', ');
      statements.push({
        database,
        sql: `DO $$ BEGIN CREATE TYPE ${quoteSchemaIdent(schema)}.${quoteSchemaIdent(column.enum.enumName)} AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      });
    }
  }

  return statements;
};

const createTableSql = (table: (typeof stageDatabaseTables)[number]): string => {
  const config = getTableConfig(table);
  const schema = config.schema;
  if (!schema) {
    throw new Error(`Table ${config.name} has no schema.`);
  }

  const references = new Map<string, string>();
  for (const foreignKey of config.foreignKeys) {
    const reference = foreignKey.reference();
    const target = getTableConfig(reference.foreignTable);
    if (!target.schema) {
      throw new Error(`Table ${target.name} has no schema.`);
    }
    const targetColumns = reference.foreignColumns
      .map((column) => quoteSchemaIdent(column.name))
      .join(', ');
    const onDelete = foreignKey.onDelete
      ? ` ON DELETE ${deleteActionSql(foreignKey.onDelete)}`
      : '';
    const clause = `REFERENCES ${quoteSchemaIdent(target.schema)}.${quoteSchemaIdent(target.name)} (${targetColumns})${onDelete}`;
    for (const column of reference.columns) {
      references.set(column.name, clause);
    }
  }

  const columns = config.columns.map((column) => {
    const parts = [`${quoteSchemaIdent(column.name)} ${columnSqlType(column)}`];
    if (column.primary) {
      parts.push('PRIMARY KEY');
    } else if (column.notNull) {
      parts.push('NOT NULL');
    }
    const reference = references.get(column.name);
    if (reference) {
      parts.push(reference);
    }
    return parts.join(' ');
  });

  return `CREATE TABLE IF NOT EXISTS ${quoteSchemaIdent(schema)}.${quoteSchemaIdent(config.name)} (${columns.join(', ')})`;
};

const provisionStatements = (stageDatabaseName: string): AuroraDataApiStatement[] => {
  const [firstTable] = stageDatabaseTables;
  if (!firstTable) {
    throw new Error('The stage database schema has no tables.');
  }
  const schema = getTableConfig(firstTable).schema;
  if (!schema) {
    throw new Error(`Table ${getTableConfig(firstTable).name} has no schema.`);
  }

  return [
    {
      database: stageDatabaseName,
      sql: `CREATE SCHEMA IF NOT EXISTS ${quoteSchemaIdent(schema)}`,
    },
    ...enumStatements(stageDatabaseName),
    ...stageDatabaseTables.map((table) => ({
      database: stageDatabaseName,
      sql: createTableSql(table),
    })),
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

  for (const statement of provisionStatements(request.stageDatabaseName)) {
    // Schema and tables must exist before the next statement runs.
    // oxlint-disable-next-line no-await-in-loop -- DDL is ordered, not parallel
    await executeStatement(client, statement);
  }
};
