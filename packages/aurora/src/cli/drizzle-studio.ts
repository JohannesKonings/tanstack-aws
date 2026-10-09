import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { drizzleKitBinary, drizzleStudioCommand, studioEnvironment } from '../drizzle-studio.ts';
import { readWorkloadStageDatabase, type StackOutput } from '../stage-database-migrate.ts';
import { readGitBranch } from './git-branch.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

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

const command = drizzleStudioCommand();
const child = spawn(process.execPath, [drizzleKitBinary(), ...command.args], {
  cwd: repoRoot,
  env: studioEnvironment(process.env, connection),
  stdio: 'inherit',
});

const exitCode = await new Promise<number>((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code) => {
    resolve(code ?? 1);
  });
});

process.exit(exitCode);
