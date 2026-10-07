import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

export function repoPath(...segments: string[]): string {
  return join(REPO_ROOT, ...segments);
}
