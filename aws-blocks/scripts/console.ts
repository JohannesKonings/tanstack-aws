import { join } from 'node:path';
import { openConsole } from '@aws-blocks/blocks/scripts';

openConsole({
  outputsFile: join(import.meta.dirname, '..', '..', '.blocks-sandbox', 'outputs.json'),
});
