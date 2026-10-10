const OUTPUT_NAMES = [
  'AURORA_CLUSTER_ARN',
  'AURORA_SECRET_ARN',
  'AURORA_DATABASE_NAME',
  'AURORA_SCHEMA',
  'DDB_TODOS_TABLE_NAME',
  'DDB_PERSONS_TABLE_NAME',
  'EVENTS_TABLE',
] as const;

/** Env var name → CloudFormation output key for the workload web server Lambda. */
export const webappServerOutputs = {
  AURORA_CLUSTER_ARN: 'AuroraClusterArn',
  AURORA_SECRET_ARN: 'AuroraSecretArn',
  AURORA_DATABASE_NAME: 'AuroraDatabaseName',
  AURORA_SCHEMA: 'AuroraSchema',
  DDB_TODOS_TABLE_NAME: 'TodosTableName',
  DDB_PERSONS_TABLE_NAME: 'PersonsTableName',
  EVENTS_TABLE: 'EventsTableName',
} satisfies Record<(typeof OUTPUT_NAMES)[number], string>;

export type WebappServerEnvironment = {
  [Name in (typeof OUTPUT_NAMES)[number]]: string;
};

/** Environment passed to every workload web server Lambda. */
export const webappServerEnvironment = (
  values: WebappServerEnvironment,
): WebappServerEnvironment => ({
  AURORA_CLUSTER_ARN: values.AURORA_CLUSTER_ARN,
  AURORA_SECRET_ARN: values.AURORA_SECRET_ARN,
  AURORA_DATABASE_NAME: values.AURORA_DATABASE_NAME,
  AURORA_SCHEMA: values.AURORA_SCHEMA,
  DDB_TODOS_TABLE_NAME: values.DDB_TODOS_TABLE_NAME,
  DDB_PERSONS_TABLE_NAME: values.DDB_PERSONS_TABLE_NAME,
  EVENTS_TABLE: values.EVENTS_TABLE,
});

export type WebappServerStackOutput = {
  logicalId: string;
  value: string;
};

/** One stack output per variable `webappServerEnvironment` returns. */
export const webappServerStackOutputs = (
  environment: WebappServerEnvironment,
): WebappServerStackOutput[] =>
  OUTPUT_NAMES.map((name) => ({
    logicalId: webappServerOutputs[name],
    value: environment[name],
  }));
