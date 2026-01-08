// oxlint-disable func-style
// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
// oxlint-disable max-statements
// oxlint-disable no-await-in-loop
// oxlint-disable func-names
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createServerFn } from '@tanstack/react-start';

// =============================================================================
// Constants
// =============================================================================

const EVENTS_TABLE = process.env.EVENTS_TABLE ?? '';
// const POLL_INTERVAL_MS = 500;
const POLL_INTERVAL_MS = 5_000_000_000;
const HEARTBEAT_INTERVAL_MS = 15000;
const MAX_STREAM_DURATION_MS = 840000; // 14 minutes

// =============================================================================
// Types
// =============================================================================

export type EntityType = 'person' | 'address' | 'bankAccount' | 'contactInfo' | 'employment';
export type EventType = 'INSERT' | 'MODIFY' | 'REMOVE';

export interface StreamEvent {
  type: 'connected' | 'change' | 'heartbeat' | 'reconnect';
  id?: string;
  timestamp?: string;
  eventType?: EventType;
  entityType?: EntityType;
  entity?: object | null;
  oldEntity?: object;
  reason?: string;
}

// =============================================================================
// DynamoDB Client
// =============================================================================

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// =============================================================================
// Helper Functions
// =============================================================================

/** Sleep for a given number of milliseconds */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Query events from the Events table since a given sort key */
const queryEventsSince = async (
  lastEventSk: string | null,
): Promise<Array<Record<string, unknown>>> => {
  if (!EVENTS_TABLE) {
    return [];
  }

  const params = {
    TableName: EVENTS_TABLE,
    KeyConditionExpression: lastEventSk ? 'pk = :pk AND sk > :sk' : 'pk = :pk',
    ExpressionAttributeValues: lastEventSk
      ? { ':pk': 'EVENTS', ':sk': lastEventSk }
      : { ':pk': 'EVENTS' },
    ScanIndexForward: true,
    Limit: 100,
  };

  const result = await ddbClient.send(new QueryCommand(params));
  return (result.Items ?? []) as Array<Record<string, unknown>>;
};

// =============================================================================
// Stream Event Producer
// =============================================================================
// Server Function with Async Generator
// =============================================================================

interface StreamInput {
  cursor?: string;
}

/** Query and yield events */
const yieldEvents = async function* (lastSkRef: {
  current: string | null;
}): AsyncGenerator<StreamEvent> {
  const events = await queryEventsSince(lastSkRef.current);
  for (const event of events) {
    yield {
      type: 'change',
      id: event.sk as string,
      timestamp: event.createdAt as string,
      eventType: event.eventType as EventType,
      entityType: event.entityType as EntityType,
      entity: event.entity as object | null,
      oldEntity: event.oldEntity as object | undefined,
    };
    lastSkRef.current = event.sk as string;
  }
};

/**
 * Stream events from the Events table using an async generator.
 * This leverages Nitro's Lambda response streaming support.
 *
 * @param cursor - Optional cursor to resume from (last event ID)
 */
export const streamEvents = createServerFn({ method: 'GET' })
  .inputValidator((input: StreamInput) => input)
  // oxlint-disable-next-line func-names, max-statements
  .handler(async function* ({ data }): AsyncGenerator<StreamEvent> {
    // Check if Events table is configured
    if (!EVENTS_TABLE) {
      yield { type: 'reconnect', reason: 'not_configured' };
      return;
    }

    const lastSkRef = { current: data.cursor ?? null };
    const startTime = Date.now();
    let lastHeartbeat = Date.now();

    // Send initial connected event
    yield { type: 'connected' };

    // Poll loop
    while (Date.now() - startTime < MAX_STREAM_DURATION_MS) {
      // Yield all new events
      // oxlint-disable-next-line no-await-in-loop
      yield* yieldEvents(lastSkRef);

      // Send heartbeat if needed
      if (Date.now() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
        yield { type: 'heartbeat' };
        lastHeartbeat = Date.now();
      }

      // Wait before next poll
      // oxlint-disable-next-line no-await-in-loop
      await sleep(POLL_INTERVAL_MS);
    }

    // Stream duration exceeded
    yield { type: 'reconnect', reason: 'timeout' };
  });
