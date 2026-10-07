import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { resolveStageLifecycle } from '../../../../lib/stage-name.ts';
import { resolveAuroraSchemaName } from '../aurora-schema.ts';
import { AuroraSchemaLifecycle } from './AuroraSchemaLifecycle.ts';
import { DatabasePersons } from './DatabasePersons.ts';
import { DatabaseTodos } from './DatabaseTodos.ts';
import { EventsTable } from './EventsTable.ts';
import { StreamToEventsProcessor } from './StreamToEventsProcessor.ts';

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
  }
}
