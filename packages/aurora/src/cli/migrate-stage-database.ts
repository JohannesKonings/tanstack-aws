import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { migrateStageDatabaseSchema } from '../stage-database-drizzle-migrate.ts';
import { applyStageDatabaseLifecycle } from '../stage-database-lifecycle.ts';
import { prepareStageDatabaseMigration, type StackOutput } from '../stage-database-migrate.ts';
import { readGitBranch } from './git-branch.ts';

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../migrations',
);

const describeStack = async (input: {
  region: string;
  stackName: string;
}): Promise<readonly StackOutput[]> => {
  const client = new CloudFormationClient({ region: input.region });
  const response = await client.send(new DescribeStacksCommand({ StackName: input.stackName }));
  return response.Stacks?.[0]?.Outputs ?? [];
};

const readParameter = async (input: { name: string; region: string }): Promise<string> => {
  const client = new SSMClient({ region: input.region });
  const response = await client.send(new GetParameterCommand({ Name: input.name }));
  const value = response.Parameter?.Value?.trim();
  if (!value) {
    throw new Error(`SSM parameter ${input.name} is empty.`);
  }
  return value;
};

const prepared = await prepareStageDatabaseMigration({
  appStage: process.env.APP_STAGE,
  branch: readGitBranch(process.cwd()),
  describeStack,
  readParameter,
  region: process.env.AWS_REGION,
});

const client = new RDSDataClient({ region: prepared.region });
await applyStageDatabaseLifecycle(
  {
    execute: async (statement) => {
      await client.send(
        new ExecuteStatementCommand({
          database: statement.database,
          resourceArn: prepared.clusterArn,
          secretArn: prepared.secretArn,
          sql: statement.sql,
        }),
      );
    },
  },
  prepared.request,
  {
    migrate: (stageDatabaseName) =>
      migrateStageDatabaseSchema({
        client,
        clusterArn: prepared.clusterArn,
        migrationsFolder,
        secretArn: prepared.secretArn,
        stageDatabaseName,
      }),
  },
);
