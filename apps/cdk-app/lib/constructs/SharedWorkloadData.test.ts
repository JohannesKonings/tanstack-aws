import { App, Stack } from 'aws-cdk-lib';
import { describe, expect, it } from 'vite-plus/test';
import { createCdkApp } from '../cdk-app.ts';
import { SharedWorkloadData } from './SharedWorkloadData.ts';

const pinnedLogicalIds = [
  'WebappAuroraSchemaLifecycle85AC824D',
  'WebappAuroraSchemaLifecycleHandlerB1C21912',
  'WebappAuroraSchemaLifecycleHandlerLogGroupF182201E',
  'WebappAuroraSchemaLifecycleHandlerServiceRoleB038FE51',
  'WebappAuroraSchemaLifecycleHandlerServiceRoleDefaultPolicyB9AA887B',
  'WebappAuroraSchemaLifecycleProviderframeworkonEvent9B0A88DA',
  'WebappAuroraSchemaLifecycleProviderframeworkonEventLogGroup310105C0',
  'WebappAuroraSchemaLifecycleProviderframeworkonEventServiceRole0F6D4594',
  'WebappAuroraSchemaLifecycleProviderframeworkonEventServiceRoleDefaultPolicy91D65903',
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
  it('overrides shared data logical IDs with the names from Webapp', () => {
    const resources = synthesizeSharedData(createCdkApp());

    expect(resources).toEqual(expect.arrayContaining(pinnedLogicalIds));
    expect(resources.some((logicalId) => logicalId.startsWith('SharedWorkloadData'))).toBe(false);
  }, 120_000);
});
