import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deploy } from '@aws-blocks/blocks/scripts';

const __dirname = dirname(fileURLToPath(import.meta.url));

deploy({
  cdkAppPath: join(__dirname, '..', 'index.cdk.ts'),
  projectRoot: join(__dirname, '..', '..'),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
