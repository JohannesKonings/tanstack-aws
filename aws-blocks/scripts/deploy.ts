import { join } from 'node:path';
import { deploy } from '@aws-blocks/blocks/scripts';

deploy({
  cdkAppPath: join(import.meta.dirname, '..', 'index.cdk.ts'),
  projectRoot: join(import.meta.dirname, '..', '..'),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
