import { createHash } from 'node:crypto';
import { CfnElement, Stack } from 'aws-cdk-lib';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct, type IConstruct } from 'constructs';
import { resolveStageLifecycle } from '../../../../lib/stage-name.ts';
import { resolveAuroraSchemaName } from '../aurora-schema.ts';
import { AuroraSchemaLifecycle } from './AuroraSchemaLifecycle.ts';
import { DatabasePersons } from './DatabasePersons.ts';
import { DatabaseTodos } from './DatabaseTodos.ts';
import { EventsTable } from './EventsTable.ts';
import { StreamToEventsProcessor } from './StreamToEventsProcessor.ts';

/** Logical IDs from when these constructs were children of `Webapp`. */
const webappLogicalIds: Record<string, string> = {
  'AuroraSchemaLifecycle/Handler': 'WebappAuroraSchemaLifecycleHandlerB1C21912',
  'AuroraSchemaLifecycle/Handler/LogGroup': 'WebappAuroraSchemaLifecycleHandlerLogGroupF182201E',
  'AuroraSchemaLifecycle/Handler/ServiceRole':
    'WebappAuroraSchemaLifecycleHandlerServiceRoleB038FE51',
  'AuroraSchemaLifecycle/Handler/ServiceRole/DefaultPolicy':
    'WebappAuroraSchemaLifecycleHandlerServiceRoleDefaultPolicyB9AA887B',
  'AuroraSchemaLifecycle/Provider/framework-onEvent':
    'WebappAuroraSchemaLifecycleProviderframeworkonEvent9B0A88DA',
  'AuroraSchemaLifecycle/Provider/framework-onEvent/LogGroup':
    'WebappAuroraSchemaLifecycleProviderframeworkonEventLogGroup310105C0',
  'AuroraSchemaLifecycle/Provider/framework-onEvent/ServiceRole':
    'WebappAuroraSchemaLifecycleProviderframeworkonEventServiceRole0F6D4594',
  'AuroraSchemaLifecycle/Provider/framework-onEvent/ServiceRole/DefaultPolicy':
    'WebappAuroraSchemaLifecycleProviderframeworkonEventServiceRoleDefaultPolicy91D65903',
  'AuroraSchemaLifecycle/Resource': 'WebappAuroraSchemaLifecycle85AC824D',
  'DatabasePersons/Persons': 'WebappDatabasePersonsE2E33589',
  'DatabaseTodos/Todos': 'WebappDatabaseTodos39DA962E',
  'EventsTable/Events': 'WebappEventsTableEventsC49DFB5F',
  'StreamToEventsProcessor/Processor': 'WebappStreamToEventsProcessor21303591',
  'StreamToEventsProcessor/Processor/LogGroup': 'WebappStreamToEventsProcessorLogGroup94729C40',
  'StreamToEventsProcessor/Processor/ServiceRole':
    'WebappStreamToEventsProcessorServiceRole48848DFA',
  'StreamToEventsProcessor/Processor/ServiceRole/DefaultPolicy':
    'WebappStreamToEventsProcessorServiceRoleDefaultPolicyB4B3285F',
};

type SharedWorkloadDataProps = {
  appStage: string;
};

export class SharedWorkloadData extends Construct {
  readonly dbTodos: Table;
  readonly dbPersons: Table;
  readonly eventsTable: Table;
  readonly auroraClusterArn: string;
  readonly auroraSecretArn: string;
  readonly auroraDatabaseName: string;

  constructor(scope: Construct, id: string, props: SharedWorkloadDataProps) {
    super(scope, id);

    const databaseTodos = new DatabaseTodos(this, 'DatabaseTodos');
    const databasePersons = new DatabasePersons(this, 'DatabasePersons');
    const eventsTable = new EventsTable(this, 'EventsTable');

    new StreamToEventsProcessor(this, 'StreamToEventsProcessor', {
      personsTable: databasePersons.dbPersons,
      eventsTable: eventsTable.table,
    });

    this.dbTodos = databaseTodos.dbTodos;
    this.dbPersons = databasePersons.dbPersons;
    this.eventsTable = eventsTable.table;

    this.auroraClusterArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/tanstack-aws/shared/aurora/cluster-arn',
    );
    this.auroraSecretArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/tanstack-aws/shared/aurora/secret-arn',
    );
    this.auroraDatabaseName = ssm.StringParameter.valueForStringParameter(
      this,
      '/tanstack-aws/shared/aurora/database-name',
    );

    const auroraSchema = resolveAuroraSchemaName(props.appStage);
    const appLifecycle = resolveStageLifecycle(props.appStage);

    new AuroraSchemaLifecycle(this, 'AuroraSchemaLifecycle', {
      clusterArn: this.auroraClusterArn,
      databaseName: this.auroraDatabaseName,
      deleteSchemaOnDelete: appLifecycle === 'ephemeral',
      schemaName: auroraSchema,
      secretArn: this.auroraSecretArn,
    });

    for (const [constructPath, logicalId] of Object.entries(webappLogicalIds)) {
      overrideLogicalId(this, constructPath, logicalId);
    }
    pinPersonsStreamMapping(this);
  }
}

const overrideLogicalId = (scope: Construct, constructPath: string, logicalId: string): void => {
  const resource = findConstruct(scope, constructPath).node.defaultChild;
  if (!CfnElement.isCfnElement(resource)) {
    throw new Error(`Missing CloudFormation resource at ${constructPath}`);
  }

  resource.overrideLogicalId(logicalId);
};

/**
 * CDK names a DynamoDB event source mapping from the table construct path, which
 * includes the stack id. Moving the table under SharedWorkloadData therefore
 * asks CloudFormation to create a second mapping for the same stream and function.
 * Lambda rejects that. Keep the logical ID from when the table lived under Webapp.
 *
 * The hash is a frozen copy of aws-cdk-lib's makeUniqueId (md5 of the path, 8 hex
 * chars). It must stay stable if CDK changes that algorithm later.
 */
const pinPersonsStreamMapping = (scope: Construct): void => {
  const processor = findConstruct(scope, 'StreamToEventsProcessor/Processor');
  const mapping = processor.node.children.find((child) =>
    child.node.id.startsWith('DynamoDBEventSource:'),
  );
  if (!mapping) {
    throw new Error(`Missing DynamoDB event source mapping under ${processor.node.path}`);
  }

  const resource = mapping.node.defaultChild;
  if (!CfnElement.isCfnElement(resource)) {
    throw new Error(`Missing CloudFormation resource at ${mapping.node.path}`);
  }

  resource.overrideLogicalId(historicalPersonsStreamMappingLogicalId(Stack.of(scope).node.id));
};

const historicalPersonsStreamMappingLogicalId = (stackId: string): string => {
  const tableId = cdkUniqueId([stackId, 'Webapp', 'DatabasePersons', 'Persons']);
  return cdkUniqueId([
    'Webapp',
    'StreamToEventsProcessor',
    'Processor',
    `DynamoDBEventSource:${tableId}`,
    'Resource',
  ]);
};

const cdkUniqueId = (components: readonly string[]): string => {
  const hash = createHash('md5')
    .update(components.join('/'))
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
  const human = removeDuplicatePathTails(components)
    .filter((component) => component !== 'Resource')
    .map((component) => component.replace(/[^A-Za-z0-9]/g, ''))
    .join('')
    .slice(0, 240);

  return `${human}${hash}`;
};

const removeDuplicatePathTails = (components: readonly string[]): string[] => {
  const unique: string[] = [];
  for (const component of components) {
    const previous = unique.at(-1);
    if (previous === undefined || !previous.endsWith(component)) {
      unique.push(component);
    }
  }
  return unique;
};

const findConstruct = (scope: Construct, constructPath: string): IConstruct => {
  let current: IConstruct = scope;
  for (const id of constructPath.split('/')) {
    const child = current.node.tryFindChild(id);
    if (!child) {
      throw new Error(`Missing construct ${constructPath} under ${scope.node.path}`);
    }
    current = child;
  }
  return current;
};
