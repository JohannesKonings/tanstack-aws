import { join } from 'node:path';
import { startDevServer } from '@aws-blocks/blocks/scripts';

// Keep in sync with BLOCKS_SIDECAR_PORT in src/webapp/integrations/blocks-client/blocksSidecar.ts
const BLOCKS_SIDECAR_PORT = 3001;

startDevServer({
  backendPath: join(import.meta.dirname, '..', 'index.ts'),
  port: BLOCKS_SIDECAR_PORT,
});
