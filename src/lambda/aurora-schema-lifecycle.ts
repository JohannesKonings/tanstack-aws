import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import type { CloudFormationCustomResourceEvent } from 'aws-lambda';

const client = new RDSDataClient({});
const VALID_SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;

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

  return {
    clusterArn,
    databaseName,
    deleteSchemaOnDelete: deleteSchemaOnDelete === 'true' ? 'true' : 'false',
    schemaName,
    secretArn,
  };
};

const runSql = async (props: SchemaResourceProps, sql: string): Promise<void> => {
  await client.send(
    new ExecuteStatementCommand({
      resourceArn: props.clusterArn,
      secretArn: props.secretArn,
      database: props.databaseName,
      sql,
    }),
  );
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
