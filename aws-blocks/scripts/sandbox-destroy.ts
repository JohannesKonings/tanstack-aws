import { join } from 'node:path';
import { destroySandbox } from '@aws-blocks/blocks/scripts';

destroySandbox(join(import.meta.dirname, '..', 'index.cdk.ts'));
