import { execFileSync } from 'node:child_process';

export const readGitBranch = (cwd: string): string | undefined => {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return branch.length > 0 ? branch : undefined;
  } catch {
    return undefined;
  }
};
