import { join } from 'node:path';
import { BlocksStack, SandboxDisableDeletionProtection } from '@aws-blocks/blocks/cdk';
import { getStackName } from '@aws-blocks/blocks/scripts';
import * as cdk from 'aws-cdk-lib';
import { Mixins, RemovalPolicies } from 'aws-cdk-lib';

const app = new cdk.App();

const sandboxMode = app.node.tryGetContext('sandboxMode') === 'true';
const projectRoot = app.node.tryGetContext('projectRoot') || process.cwd();

const stackName = getStackName({ sandbox: sandboxMode, projectRoot });
export const blocksStack = await BlocksStack.create(app, stackName, {
  backendHandlerPath: join(import.meta.dirname, 'index.handler.ts'),
  backendCDKPath: join(import.meta.dirname, 'index.ts'),
});

if (sandboxMode) {
  // Make all resources deletable so sandbox:destroy can clean up the entire stack.
  // This overrides removal policies and deletion protection (e.g. RDS) for every
  // resource in the stack, including any you add below.
  // Remove these lines if you want to manage teardown behavior yourself.
  RemovalPolicies.of(blocksStack).destroy();
  Mixins.of(blocksStack).apply(new SandboxDisableDeletionProtection());

  // Tell the runtime that cookies need cross-domain attributes (frontend on
  // localhost, API on API Gateway — different registrable domains).
  blocksStack.handler.addEnvironment('BLOCKS_SANDBOX', 'true');
}
