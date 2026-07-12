import { join } from 'node:path';

export const blocksBackendPaths = {
  backendHandlerPath: join(import.meta.dirname, '../aws-blocks/index.handler.ts'),
  backendCDKPath: join(import.meta.dirname, '../aws-blocks/index.ts'),
} as const;
