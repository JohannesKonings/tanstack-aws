import { join } from 'node:path';
import { destroy } from '@aws-blocks/blocks/scripts';

destroy({
  cdkAppPath: join(import.meta.dirname, '..', 'index.cdk.ts'),
  projectRoot: join(import.meta.dirname, '..', '..'),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
