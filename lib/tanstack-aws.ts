import { BlocksBackend } from '@aws-blocks/blocks/cdk';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { blocksBackendPaths } from './blocks-backend-paths.ts';
import { Webapp } from './constructs/Webapp.ts';

export type TanstackAwsStackProps = cdk.StackProps & {
  appStage: string;
};

export class TanstackAwsStack extends cdk.Stack {
  blocksBackend!: BlocksBackend;
}

export async function createTanstackAwsStack(
  scope: Construct,
  id: string,
  props: TanstackAwsStackProps,
): Promise<TanstackAwsStack> {
  const stack = new TanstackAwsStack(scope, id, props);
  stack.blocksBackend = await BlocksBackend.create(stack, 'BlocksBackend', blocksBackendPaths);

  new Webapp(stack, 'Webapp', {
    appStage: props.appStage,
    blocksApiUrl: stack.blocksBackend.apiUrl,
  });

  return stack;
}
