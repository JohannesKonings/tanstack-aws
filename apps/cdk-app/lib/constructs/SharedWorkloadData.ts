import { CfnElement } from 'aws-cdk-lib';
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
  }
}

const overrideLogicalId = (scope: Construct, constructPath: string, logicalId: string): void => {
  let current: IConstruct = scope;
  for (const id of constructPath.split('/')) {
    const child = current.node.tryFindChild(id);
    if (!child) {
      throw new Error(`Missing construct ${constructPath} under ${scope.node.path}`);
    }
    current = child;
  }

  const resource = current.node.defaultChild;
  if (!CfnElement.isCfnElement(resource)) {
    throw new Error(`Missing CloudFormation resource at ${constructPath}`);
  }

  resource.overrideLogicalId(logicalId);
};
