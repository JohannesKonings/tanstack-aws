import { App, Stack } from 'aws-cdk-lib';
import { describe, expect, it } from 'vite-plus/test';
import { createCdkApp } from '../cdk-app.ts';
import { SharedWorkloadData } from './SharedWorkloadData.ts';

const stageDatabaseLifecycleLogicalIds = [
  'SharedWorkloadDataStageDatabaseLifecycleFE26ACE7',
  'SharedWorkloadDataStageDatabaseLifecycleHandler44BC85B2',
  'SharedWorkloadDataStageDatabaseLifecycleHandlerLogGroupD7138760',
  'SharedWorkloadDataStageDatabaseLifecycleHandlerServiceRole5D76EB47',
  'SharedWorkloadDataStageDatabaseLifecycleHandlerServiceRoleDefaultPolicyAEF95E06',
  'SharedWorkloadDataStageDatabaseLifecycleProviderframeworkonEvent21FAA5EA',
  'SharedWorkloadDataStageDatabaseLifecycleProviderframeworkonEventLogGroup60647968',
  'SharedWorkloadDataStageDatabaseLifecycleProviderframeworkonEventServiceRole0D97F7EA',
  'SharedWorkloadDataStageDatabaseLifecycleProviderframeworkonEventServiceRoleDefaultPolicyB7E02C41',
];

const pinnedLogicalIds = [
  'WebappDatabasePersonsE2E33589',
  'WebappDatabaseTodos39DA962E',
  'WebappEventsTableEventsC49DFB5F',
  'WebappStreamToEventsProcessor21303591',
  'WebappStreamToEventsProcessorDynamoDBEventSourceTanstackAwsStackmainWebappDatabasePersonsB9F7D887328F8082',
  'WebappStreamToEventsProcessorLogGroup94729C40',
  'WebappStreamToEventsProcessorServiceRole48848DFA',
  'WebappStreamToEventsProcessorServiceRoleDefaultPolicyB4B3285F',
];

const resourceKeys = (template: unknown): string[] => {
  if (typeof template !== 'object' || template === null) {
    throw new Error('Synthesized template was not an object');
  }

  const resources = Reflect.get(template, 'Resources');
  if (typeof resources !== 'object' || resources === null) {
    throw new Error('Synthesized template has no Resources');
  }

  return Object.keys(resources);
};

const synthesizeSharedData = (app: App): string[] => {
  const stack = new Stack(app, 'TanstackAwsStack-main', {
    env: { account: '123456789012', region: 'us-east-2' },
  });
  new SharedWorkloadData(stack, 'SharedWorkloadData', { appStage: 'dev' });
  return resourceKeys(app.synth().getStackByName(stack.stackName).template);
};

describe('SharedWorkloadData', () => {
  it('keeps the Webapp logical IDs and replaces the stage database lifecycle ids', () => {
    const resources = synthesizeSharedData(createCdkApp());

    expect(resources.toSorted()).toEqual(
      [...pinnedLogicalIds, ...stageDatabaseLifecycleLogicalIds].toSorted(),
    );
  }, 120_000);
});
