import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { App } from 'aws-cdk-lib';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function readCdkContext(): Record<string, unknown> {
  const cdkJsonPath = join(packageRoot, 'cdk.json');
  const cdkJson = JSON.parse(readFileSync(cdkJsonPath, 'utf8')) as {
    context?: Record<string, unknown>;
  };

  return cdkJson.context ?? {};
}

/** CDK app with this package's `cdk.json` context (matches `vp -C apps/cdk-account-setup exec cdk`). */
export function createAccountSetupApp(): App {
  return new App({ context: readCdkContext() });
}
