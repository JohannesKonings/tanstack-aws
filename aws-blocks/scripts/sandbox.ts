import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSandbox } from '@aws-blocks/blocks/scripts';

const __dirname = dirname(fileURLToPath(import.meta.url));

startSandbox({
  backendPath: join(__dirname, '..', 'index.cdk.ts'),
});
