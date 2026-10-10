import { describe, expect, it } from 'vite-plus/test';
import {
  drizzleKitBinary,
  drizzleKitCommand,
  drizzleStudioCommand,
  parseDrizzleKitCli,
  studioEnvironment,
} from './drizzle-studio.ts';

describe('drizzle studio', () => {
  it('configures studio for the postgresql data api and the person schema', async () => {
    process.env.AURORA_CLUSTER_ARN = 'arn:aws:rds:us-east-2:123456789012:cluster:shared';
    process.env.AURORA_DATABASE_NAME = 'feature_checkout';
    process.env.AURORA_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared';

    const config = await import('../drizzle.config.ts');

    expect(config.default).toMatchObject({
      dialect: 'postgresql',
      driver: 'aws-data-api',
      dbCredentials: {
        database: 'feature_checkout',
        resourceArn: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
        secretArn: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:shared',
      },
    });
    expect(String(config.default.schema)).toContain('person-schema.ts');
    expect(String(config.default.out)).toContain('packages/aurora/migrations');
  });

  it('starts drizzle-kit studio and does not generate, migrate, push, or pull', () => {
    expect(drizzleStudioCommand()).toEqual({
      args: ['studio', '--config', 'packages/aurora/drizzle.config.ts'],
      command: 'drizzle-kit',
    });
    expect(drizzleKitBinary()).toMatch(/drizzle-kit\/bin\.cjs$/);
  });

  it('applies generated SQL with drizzle-kit migrate', () => {
    expect(parseDrizzleKitCli(['migrate'])).toEqual({
      extraArgs: [],
      subcommand: 'migrate',
    });
    expect(drizzleKitCommand('migrate')).toEqual({
      args: ['migrate', '--config', 'packages/aurora/drizzle.config.ts'],
      command: 'drizzle-kit',
    });
  });

  it('starts drizzle-kit generate and forwards extra arguments', () => {
    expect(parseDrizzleKitCli(['generate', '--name', 'init'])).toEqual({
      extraArgs: ['--name', 'init'],
      subcommand: 'generate',
    });
    expect(drizzleKitCommand('generate', ['--name', 'init'])).toEqual({
      args: ['generate', '--config', 'packages/aurora/drizzle.config.ts', '--name', 'init'],
      command: 'drizzle-kit',
    });
  });

  it('passes the stage database credentials and region to studio', () => {
    expect(
      studioEnvironment(
        { AWS_PROFILE: 'dev' },
        {
          clusterArn: 'arn:cluster',
          region: 'us-east-2',
          secretArn: 'arn:secret',
          stageDatabaseName: 'feature_checkout',
        },
      ),
    ).toEqual({
      AURORA_CLUSTER_ARN: 'arn:cluster',
      AURORA_DATABASE_NAME: 'feature_checkout',
      AURORA_SECRET_ARN: 'arn:secret',
      AWS_PROFILE: 'dev',
      AWS_REGION: 'us-east-2',
    });
  });
});
