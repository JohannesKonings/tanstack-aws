import { BlocksBackend } from '@aws-blocks/blocks/cdk';
import { App, Aspects, Stack, type StackProps } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, ServerlessChecks } from 'cdk-nag';
import { Construct } from 'constructs';
import { describe, expect, it } from 'vite-plus/test';
import { blocksBackendPaths } from './blocks-backend-paths.ts';
import { applyBlocksBackendNagSuppressions } from './constructs/BlocksBackendNagSuppressions.ts';

class BlocksBackendNagTestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}

const ensureCdkConditionActive = (): void => {
  const nodeOptions = process.env.NODE_OPTIONS ?? '';
  if (!nodeOptions.includes('--conditions=cdk')) {
    process.env.NODE_OPTIONS = nodeOptions ? `${nodeOptions} --conditions=cdk` : '--conditions=cdk';
  }
};

const synthesizeBlocksBackendWithNagChecks = async () => {
  ensureCdkConditionActive();

  const app = new App();
  Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
  Aspects.of(app).add(new ServerlessChecks({ verbose: true }));

  const stack = new BlocksBackendNagTestStack(app, 'TanstackAwsStack-feature-main', {
    env: {
      account: '123456789012',
      region: 'us-east-2',
    },
  });

  const blocksBackend = await BlocksBackend.create(stack, 'BlocksBackend', blocksBackendPaths);
  applyBlocksBackendNagSuppressions(blocksBackend);

  app.synth();
  return stack;
};

describe('BlocksBackend cdk-nag compliance', () => {
  it('synth passes AwsSolutions and Serverless checks', async () => {
    const stack = await synthesizeBlocksBackendWithNagChecks();
    const annotations = Annotations.fromStack(stack);

    expect(annotations.findError('*', Match.anyValue())).toEqual([]);
  }, 120_000);
});
