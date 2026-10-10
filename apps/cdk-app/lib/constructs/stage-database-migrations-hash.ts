import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Fingerprint of the SQL Drizzle applies. A new migration changes the custom resource. */
export const hashStageDatabaseMigrations = (migrationsFolder: string): string => {
  const hash = createHash('sha256');
  const names = readdirSync(migrationsFolder)
    .filter((name) => existsSync(path.join(migrationsFolder, name, 'migration.sql')))
    .sort();

  for (const name of names) {
    hash.update(name);
    hash.update('\0');
    hash.update(readFileSync(path.join(migrationsFolder, name, 'migration.sql')));
    hash.update('\0');
  }

  return hash.digest('hex');
};
