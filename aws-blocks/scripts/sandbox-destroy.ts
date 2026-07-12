import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { destroySandbox } from '@aws-blocks/blocks/scripts';

const __dirname = dirname(fileURLToPath(import.meta.url));

destroySandbox(join(__dirname, '..', 'index.cdk.ts'));
