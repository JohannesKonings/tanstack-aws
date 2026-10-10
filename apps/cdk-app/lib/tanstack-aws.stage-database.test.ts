import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { createCdkApp } from './cdk-app.ts';
import { repoPath } from './repo-root.ts';
import { TanstackAwsStack } from './tanstack-aws.ts';

const ensureAssetDir = (relativePath: string): void => {
  const directory = repoPath(relativePath);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'placeholder.txt'), 'placeholder');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const synthesizeWorkloadStack = (): unknown => {
  for (const assetPath of [
    '.output/server',
    '.output/public',
    'apps/webapp-admin/.output/server',
    'apps/webapp-admin/.output/public',
  ]) {
    ensureAssetDir(assetPath);
  }

  const app = createCdkApp();
  const stack = new TanstackAwsStack(app, 'TanstackAwsStack-feature-checkout', {
    appStage: 'feature-checkout',
    env: { account: '123456789012', region: 'us-east-2' },
  });
  return app.synth().getStackByName(stack.stackName).template;
};

const auroraEnvironments = (template: unknown): Record<string, unknown>[] => {
  if (!isRecord(template) || !isRecord(template.Resources)) {
    throw new Error('Synthesized template has no Resources');
  }

  const environments: Record<string, unknown>[] = [];
  for (const resource of Object.values(template.Resources)) {
    if (
      !isRecord(resource) ||
      resource.Type !== 'AWS::Lambda::Function' ||
      !isRecord(resource.Properties)
    ) {
      continue;
    }
    const environment = resource.Properties.Environment;
    if (!isRecord(environment) || !isRecord(environment.Variables)) {
      continue;
    }
    if (!('AURORA_CLUSTER_ARN' in environment.Variables)) {
      continue;
    }
    environments.push(environment.Variables);
  }
  return environments;
};

const outputValue = (template: unknown, name: string): unknown => {
  if (!isRecord(template) || !isRecord(template.Outputs)) {
    throw new Error('Synthesized template has no Outputs');
  }
  const output = template.Outputs[name];
  if (!isRecord(output) || !('Value' in output)) {
    throw new Error(`Missing stack output ${name}`);
  }
  return output.Value;
};

describe('Workload stack stage database', () => {
  it('gives both workload frontends the stage database connection and exports it', () => {
    const template = synthesizeWorkloadStack();
    const environments = auroraEnvironments(template);

    expect(environments).toHaveLength(2);
    for (const environment of environments) {
      expect(environment.AURORA_DATABASE_NAME).toBe('feature_checkout');
      expect(environment.AURORA_SCHEMA).toBe('default');
      expect(environment.AURORA_CLUSTER_ARN).toEqual(outputValue(template, 'AuroraClusterArn'));
      expect(environment.AURORA_SECRET_ARN).toEqual(outputValue(template, 'AuroraSecretArn'));
    }
    expect(outputValue(template, 'AuroraDatabaseName')).toBe('feature_checkout');
    expect(outputValue(template, 'AuroraSchema')).toBe('default');
  }, 180_000);
});
