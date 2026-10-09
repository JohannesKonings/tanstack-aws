import { describe, expect, it } from 'vite-plus/test';
import {
  webappServerEnvironment,
  webappServerOutputs,
  webappServerStackOutputs,
} from './webapp-server-environment.ts';

const source = {
  AURORA_CLUSTER_ARN: 'arn:aws:rds:us-east-2:123456789012:cluster:shared',
  AURORA_DATABASE_NAME: 'main',
  AURORA_SCHEMA: 'default',
  AURORA_SECRET_ARN: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:aurora',
  DDB_PERSONS_TABLE_NAME: 'persons',
  DDB_TODOS_TABLE_NAME: 'todos',
  EVENTS_TABLE: 'events',
};

describe('webapp server environment', () => {
  it('publishes one stack output for every Lambda variable', () => {
    const environment = webappServerEnvironment(source);
    const outputs = webappServerStackOutputs(environment);

    expect(outputs).toEqual([
      { logicalId: webappServerOutputs.AURORA_CLUSTER_ARN, value: source.AURORA_CLUSTER_ARN },
      { logicalId: webappServerOutputs.AURORA_SECRET_ARN, value: source.AURORA_SECRET_ARN },
      {
        logicalId: webappServerOutputs.AURORA_DATABASE_NAME,
        value: source.AURORA_DATABASE_NAME,
      },
      { logicalId: webappServerOutputs.AURORA_SCHEMA, value: source.AURORA_SCHEMA },
      {
        logicalId: webappServerOutputs.DDB_TODOS_TABLE_NAME,
        value: source.DDB_TODOS_TABLE_NAME,
      },
      {
        logicalId: webappServerOutputs.DDB_PERSONS_TABLE_NAME,
        value: source.DDB_PERSONS_TABLE_NAME,
      },
      { logicalId: webappServerOutputs.EVENTS_TABLE, value: source.EVENTS_TABLE },
    ]);
    expect(outputs).toHaveLength(Object.keys(environment).length);
  });
});
