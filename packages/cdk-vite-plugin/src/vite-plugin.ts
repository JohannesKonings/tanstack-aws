import { execFileSync } from 'node:child_process';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import type { Plugin } from 'vite-plus';
import { WORKLOAD_REGION } from '../../../lib/workload-region.ts';
import {
  applyStackEnvironment,
  type CdkDevServerOutputs,
  readStackEnvironment,
} from './stack-environment.ts';
import { resolveWorkloadStack } from './workload-stack.ts';

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

type CdkDevServerOptions = {
  /** Env var name → CloudFormation output key on the workload stack. */
  outputs: CdkDevServerOutputs;
};

/** Copy stack outputs into the dev server. A failed or incomplete lookup leaves them unset. */
export const cdkDevServer = (options: CdkDevServerOptions): Plugin => ({
  name: 'tanstack-aws-cdk-dev-server',
  async config(_config, env) {
    if (env.command !== 'serve') {
      return;
    }

    const resolved = resolveWorkloadStack({
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
      const environment = readStackEnvironment(
        options.outputs,
        response.Stacks?.[0]?.Outputs ?? [],
      );
      if (!environment) {
        console.warn(
          `Stack outputs are incomplete for ${resolved.stackName}; leaving local environment unset.`,
        );
        return;
      }

      applyStackEnvironment(process.env, environment);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Stack output lookup failed for ${resolved.stackName}; leaving local environment unset. ${message}`,
      );
    }
  },
});
