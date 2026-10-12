import { execFileSync } from 'node:child_process';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import type { Plugin } from 'vite-plus';
import {
  applyDevServerRegion,
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
  /** Region used for stack lookup when `AWS_REGION` is unset. */
  awsRegion: string;
};

/** Copy `awsRegion` and stack outputs into the dev server. A failed or incomplete lookup leaves stack outputs unset. */
export const cdkDevServer = (options: CdkDevServerOptions): Plugin => ({
  name: 'tanstack-aws-cdk-dev-server',
  async config(_config, env) {
    if (env.command !== 'serve') {
      return;
    }

    const region = applyDevServerRegion(process.env, options.awsRegion);
    const resolved = resolveWorkloadStack({
      appStage: process.env.APP_STAGE,
      branch: readGitBranch(process.cwd()),
    });
    if (!resolved) {
      return;
    }

    try {
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
