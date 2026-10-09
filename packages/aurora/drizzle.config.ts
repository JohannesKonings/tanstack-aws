import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

const setting = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} for Drizzle Studio.`);
  }
  return value;
};

export default defineConfig({
  dbCredentials: {
    database: setting('AURORA_DATABASE_NAME'),
    resourceArn: setting('AURORA_CLUSTER_ARN'),
    secretArn: setting('AURORA_SECRET_ARN'),
  },
  dialect: 'postgresql',
  driver: 'aws-data-api',
  schema: path.join(packageRoot, 'src/person-schema.ts'),
});
