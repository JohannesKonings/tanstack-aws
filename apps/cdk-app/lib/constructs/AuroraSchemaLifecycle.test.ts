import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Stack } from 'aws-cdk-lib';
import { describe, expect, it } from 'vite-plus/test';
import { createCdkApp } from '../cdk-app.ts';
import { repoPath } from '../repo-root.ts';
import { AuroraSchemaLifecycle } from './AuroraSchemaLifecycle.ts';
import { hashStageDatabaseMigrations } from './stage-database-migrations-hash.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const lifecycleProperties = (template: unknown): Record<string, unknown> => {
  if (!isRecord(template) || !isRecord(template.Resources)) {
    throw new Error('Synthesized template has no Resources');
  }

  for (const resource of Object.values(template.Resources)) {
    if (!isRecord(resource) || resource.Type !== 'AWS::CloudFormation::CustomResource') {
      continue;
    }
    if (
      !isRecord(resource.Properties) ||
      resource.Properties.stageDatabaseName !== 'aurora_example'
    ) {
      continue;
    }
    return resource.Properties;
  }

  throw new Error('Stage database lifecycle custom resource is missing');
};

describe('stage database migrations hash', () => {
  it('changes when a migration file changes', () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'stage-migrations-'));
    try {
      const migration = path.join(folder, '20261009181137_right_prodigy');
      mkdirSync(migration);
      const sqlFile = path.join(migration, 'migration.sql');
      writeFileSync(
        sqlFile,
        'ALTER TABLE "default"."contacts" ADD COLUMN "testjk" boolean NOT NULL;\n',
      );
      const before = hashStageDatabaseMigrations(folder);
      writeFileSync(sqlFile, 'ALTER TABLE "default"."contacts" DROP COLUMN "testjk";\n');
      const after = hashStageDatabaseMigrations(folder);

      expect(before).not.toBe(after);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});

describe('AuroraSchemaLifecycle', () => {
  it('changes the custom resource when stage database migration SQL changes', () => {
    const app = createCdkApp();
    const stack = new Stack(app, 'TanstackAwsStack-aurora-example', {
      env: { account: '123456789012', region: 'us-east-2' },
    });
    new AuroraSchemaLifecycle(stack, 'AuroraSchemaLifecycle', {
      clusterArn: 'arn:aws:rds:us-east-2:123456789012:cluster:tanstack',
      dropDatabaseOnDelete: true,
      maintenanceDatabaseName: 'tanstackaws',
      secretArn: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:tanstack',
      stageDatabaseName: 'aurora_example',
    });

    const properties = lifecycleProperties(app.synth().getStackByName(stack.stackName).template);

    expect(properties.migrationsHash).toBe(
      hashStageDatabaseMigrations(repoPath('packages/aurora/migrations')),
    );
  });
});
