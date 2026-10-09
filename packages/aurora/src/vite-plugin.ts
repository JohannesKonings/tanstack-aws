import { execFileSync } from 'node:child_process';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import type { Plugin } from 'vite-plus';
import { WORKLOAD_REGION } from '../../../lib/workload-region.ts';
import { resolveWorkloadStackStage } from './workload-stack-stage.ts';

const OUTPUT_KEYS = {
  clusterArn: 'AuroraClusterArn',
  databaseName: 'AuroraDatabaseName',
  schema: 'AuroraSchema',
  secretArn: 'AuroraSecretArn',
} as const;

const readGitBranch = (cwd: string): string | undefined => {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return branch.length > 0 ? branch : undefined;
  } catch {
    return undefined;
  }
};

const outputValue = (
  outputs: { OutputKey?: string; OutputValue?: string }[],
  key: string,
): string | undefined => outputs.find((output) => output.OutputKey === key)?.OutputValue;

/** Point a dev server at TanstackAwsStack-<stage>. A failed lookup leaves Aurora unset. */
export const auroraDevServer = (): Plugin => ({
  name: 'tanstack-aws-aurora-dev-server',
  async config(_config, env) {
    if (env.command !== 'serve') {
      return;
    }

    const resolved = resolveWorkloadStackStage({
      appStage: process.env.APP_STAGE,
      branch: readGitBranch(process.cwd()),
    });
    if (!resolved) {
      return;
    }

    try {
      const region = process.env.AWS_REGION?.trim() || WORKLOAD_REGION;
      const client = new CloudFormationClient({ region });
      const response = await client.send(
        new DescribeStacksCommand({ StackName: resolved.stackName }),
      );
      const outputs = response.Stacks?.[0]?.Outputs ?? [];
      const clusterArn = outputValue(outputs, OUTPUT_KEYS.clusterArn);
      const secretArn = outputValue(outputs, OUTPUT_KEYS.secretArn);
      const databaseName = outputValue(outputs, OUTPUT_KEYS.databaseName);
      const schema = outputValue(outputs, OUTPUT_KEYS.schema);
      if (!clusterArn || !secretArn || !databaseName || !schema) {
        return;
      }

      process.env.AURORA_CLUSTER_ARN = clusterArn;
      process.env.AURORA_DATABASE_NAME = databaseName;
      process.env.AURORA_SCHEMA = schema;
      process.env.AURORA_SECRET_ARN = secretArn;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Aurora workload stack lookup failed for ${resolved.stackName}; leaving Aurora unset. ${message}`,
      );
    }
  },
});
