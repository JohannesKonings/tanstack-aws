import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import type { CloudFormationCustomResourceEvent } from 'aws-lambda';

const client = new RDSDataClient({});
const VALID_SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;
const AURORA_RESUME_RETRY_ATTEMPTS = 4;
const AURORA_RESUME_RETRY_DELAY_MS = 30_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isAuroraResumingError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('resuming after being auto-paused');
};

type SchemaResourceProps = {
  clusterArn: string;
  databaseName: string;
  deleteSchemaOnDelete: 'true' | 'false';
  schemaName: string;
  secretArn: string;
};

const toProps = (event: CloudFormationCustomResourceEvent): SchemaResourceProps => {
  const clusterArn = String(event.ResourceProperties.clusterArn ?? '');
  const databaseName = String(event.ResourceProperties.databaseName ?? '');
  const deleteSchemaOnDelete = String(event.ResourceProperties.deleteSchemaOnDelete ?? 'false');
  const schemaName = String(event.ResourceProperties.schemaName ?? '');
  const secretArn = String(event.ResourceProperties.secretArn ?? '');

  if (!clusterArn || !databaseName || !schemaName || !secretArn) {
    throw new Error('Missing required custom resource properties for Aurora schema lifecycle.');
  }
  if (!VALID_SCHEMA_NAME.test(schemaName)) {
    throw new Error(`Invalid Aurora schema name: ${schemaName}`);
  }
  const reservedSchemaNames = new Set(['public', 'information_schema']);
  if (reservedSchemaNames.has(schemaName.toLowerCase()) || /^pg_/i.test(schemaName)) {
    throw new Error(`Refusing to manage reserved Aurora schema name: ${schemaName}`);
  }

  return {
    clusterArn,
    databaseName,
    deleteSchemaOnDelete: deleteSchemaOnDelete === 'true' ? 'true' : 'false',
    schemaName,
    secretArn,
  };
};

const runSql = async (props: SchemaResourceProps, sql: string): Promise<void> => {
  for (let attempt = 0; attempt <= AURORA_RESUME_RETRY_ATTEMPTS; attempt++) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- sequential retries with backoff
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: props.clusterArn,
          secretArn: props.secretArn,
          database: props.databaseName,
          sql,
        }),
      );
      return;
    } catch (error) {
      const shouldRetry = isAuroraResumingError(error) && attempt < AURORA_RESUME_RETRY_ATTEMPTS;
      if (!shouldRetry) {
        throw error;
      }
      // oxlint-disable-next-line no-console -- retry attempts are swallowed until the last failure
      console.log(
        `aurora-schema-lifecycle: Aurora is resuming after auto-pause; retry ${attempt + 1} of ${AURORA_RESUME_RETRY_ATTEMPTS} in ${AURORA_RESUME_RETRY_DELAY_MS}ms`,
      );
      // oxlint-disable-next-line no-await-in-loop -- wait for Aurora to finish resuming
      await sleep(AURORA_RESUME_RETRY_DELAY_MS);
    }
  }
};

export const handler = async (event: CloudFormationCustomResourceEvent) => {
  const props = toProps(event);
  const quotedSchemaName = `"${props.schemaName}"`;

  if (event.RequestType === 'Delete') {
    if (props.deleteSchemaOnDelete === 'true') {
      await runSql(props, `DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
    }
    return {
      PhysicalResourceId: props.schemaName,
    };
  }

  await runSql(props, `CREATE SCHEMA IF NOT EXISTS ${quotedSchemaName}`);
  return {
    PhysicalResourceId: props.schemaName,
  };
};
