import { join } from 'node:path';
import { startDevServer } from '@aws-blocks/blocks/scripts';

startDevServer({
  backendPath: join(import.meta.dirname, '..', 'index.ts'),
  port: 3001,
});
