import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openConsole } from '@aws-blocks/blocks/scripts';

const __dirname = dirname(fileURLToPath(import.meta.url));

openConsole({
  outputsFile: join(__dirname, '..', '..', '.blocks-sandbox', 'outputs.json'),
});
