import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { withAuroraResumeRetry } from '../aurora-resume.ts';
import { SEED_PERSON_COUNT, seedStageDatabase } from '../seed-persons.ts';
import { readWorkloadStageDatabase, type StackOutput } from '../stage-database-migrate.ts';
import { readGitBranch } from './git-branch.ts';

const describeStack = async (input: {
  region: string;
  stackName: string;
}): Promise<readonly StackOutput[]> => {
  const client = new CloudFormationClient({ region: input.region });
  const response = await client.send(new DescribeStacksCommand({ StackName: input.stackName }));
  return response.Stacks?.[0]?.Outputs ?? [];
};

const connection = await readWorkloadStageDatabase({
  appStage: process.env.APP_STAGE,
  branch: readGitBranch(process.cwd()),
  describeStack,
  region: process.env.AWS_REGION,
});

const client = new RDSDataClient({ region: connection.region });

console.log(
  `Seeding ${SEED_PERSON_COUNT} persons into stage database ${connection.stageDatabaseName}`,
);

const seeded = await withAuroraResumeRetry(() =>
  seedStageDatabase({
    client,
    clusterArn: connection.clusterArn,
    secretArn: connection.secretArn,
    stageDatabaseName: connection.stageDatabaseName,
  }),
);

console.log(
  `Seeded ${seeded.persons} persons with ${seeded.addresses} addresses, ${seeded.contacts} contacts, ${seeded.bankAccounts} bank accounts, and ${seeded.employments} employments`,
);
