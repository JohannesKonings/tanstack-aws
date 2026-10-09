import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import { applyStageDatabaseLifecycle } from '@tanstack-aws/aurora/lifecycle';
import type { CloudFormationCustomResourceEvent } from 'aws-lambda';

const client = new RDSDataClient({});
const AURORA_RESUME_RETRY_ATTEMPTS = 4;
const AURORA_RESUME_RETRY_DELAY_MS = 30_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isAuroraResumingError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('resuming after being auto-paused');
};

type ConnectionProps = {
  clusterArn: string;
  secretArn: string;
};

const stringProp = (event: CloudFormationCustomResourceEvent, name: string): string | undefined => {
  const value = event.ResourceProperties[name];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const requiredProp = (event: CloudFormationCustomResourceEvent, name: string): string => {
  const value = stringProp(event, name);
  if (!value) {
    throw new Error(
      `Missing required custom resource property ${name} for stage database lifecycle.`,
    );
  }
  return value;
};

const runSql = async (props: ConnectionProps, database: string, sql: string): Promise<void> => {
  for (let attempt = 0; attempt <= AURORA_RESUME_RETRY_ATTEMPTS; attempt++) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- sequential retries with backoff
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: props.clusterArn,
          secretArn: props.secretArn,
          database,
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
  const stageDatabaseName = stringProp(event, 'stageDatabaseName');
  if (!stageDatabaseName) {
    return {
      PhysicalResourceId: stringProp(event, 'schemaName') ?? 'legacy-aurora-schema',
    };
  }

  const connection = {
    clusterArn: requiredProp(event, 'clusterArn'),
    secretArn: requiredProp(event, 'secretArn'),
  };
  const maintenanceDatabaseName = requiredProp(event, 'maintenanceDatabaseName');

  await applyStageDatabaseLifecycle(
    {
      execute: (statement) => runSql(connection, statement.database, statement.sql),
    },
    {
      dropDatabaseOnDelete: stringProp(event, 'dropDatabaseOnDelete') === 'true',
      maintenanceDatabase: maintenanceDatabaseName,
      requestType: event.RequestType,
      stageDatabaseName,
    },
  );

  return {
    PhysicalResourceId: stageDatabaseName,
  };
};
