import { join } from 'node:path';
import { startSandbox } from '@aws-blocks/blocks/scripts';

startSandbox({
  backendPath: join(import.meta.dirname, '..', 'index.cdk.ts'),
});
