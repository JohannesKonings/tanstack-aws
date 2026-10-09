export {
  AuroraConfigurationError,
  createStageDatabaseClient,
  readAuroraSettings,
  type AuroraSettings,
} from './client.ts';
export {
  addressSelectSchema,
  addresses,
  bankAccountSelectSchema,
  bankAccounts,
  contactSelectSchema,
  contacts,
  employmentSelectSchema,
  employments,
  personSelectSchema,
  persons,
} from './person-schema.ts';
export { resolveStageDatabaseName, STAGE_DATABASE_SCHEMA } from './stage-database-name.ts';
export { migrateStageDatabaseSchema } from './stage-database-drizzle-migrate.ts';
export {
  applyStageDatabaseLifecycle,
  type AuroraDataApiClient,
  type AuroraDataApiStatement,
  type StageDatabaseLifecycleRequest,
  type StageDatabaseMigrator,
} from './stage-database-lifecycle.ts';
