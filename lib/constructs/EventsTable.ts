import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * Events Table for SSE Event Store Pattern
 *
 * Stores entity change events from DynamoDB Streams for SSE clients to query.
 * Each client queries independently - no message consumption/competition.
 *
 * Key Design:
 * - pk: "EVENTS" (single partition for simplicity, scales to ~10k events/sec)
 * - sk: timestamp#ULID (sortable, unique across concurrent writes)
 * - ttl: Auto-delete after 1 hour (clients can catch up after reconnect)
 *
 * @see docs/PLAN-DB-PERSONS.md Section 15B for architecture details
 */
export class EventsTable extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new Table(this, 'Events', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl', // Auto-delete old events
    });
  }
}
