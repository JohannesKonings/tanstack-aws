// oxlint-disable func-style
// oxlint-disable no-ternary
// oxlint-disable no-magic-numbers
// oxlint-disable max-statements
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { createFileRoute } from '@tanstack/react-router';

// =============================================================================
// Constants
// =============================================================================

const EVENTS_TABLE = process.env.EVENTS_TABLE ?? '';

// =============================================================================
// DynamoDB Client
// =============================================================================

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// =============================================================================
// Helper Functions
// =============================================================================

/** Build query params for events query */
const buildQueryParams = (cursor: string | null): QueryCommandInput => ({
  TableName: EVENTS_TABLE,
  KeyConditionExpression: cursor ? 'pk = :pk AND sk > :sk' : 'pk = :pk',
  ExpressionAttributeValues: cursor ? { ':pk': 'EVENTS', ':sk': cursor } : { ':pk': 'EVENTS' },
  ScanIndexForward: true,
  Limit: 100,
});

/** Format DynamoDB items to event response */
const formatEvents = (items: Array<Record<string, unknown>>): Array<Record<string, unknown>> =>
  items.map((item) => ({
    id: item.sk,
    timestamp: item.createdAt,
    eventType: item.eventType,
    entityType: item.entityType,
    entity: item.entity,
    oldEntity: item.oldEntity,
  }));

/** Get last cursor from events array */
const getLastCursor = (
  events: Array<Record<string, unknown>>,
  defaultCursor: string | null,
): string | null => {
  if (events.length > 0) {
    const lastEvent = events[events.length - 1];
    if (lastEvent?.id) {
      return lastEvent.id as string;
    }
  }
  return defaultCursor;
};

// =============================================================================
// Events Polling API Route
// =============================================================================

/**
 * Events Polling API Route
 *
 * Returns entity change events since a given cursor.
 * Used by clients to poll for changes instead of SSE streaming.
 */
export const Route = createFileRoute('/api/sse/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Check if Events table is configured
        if (!EVENTS_TABLE) {
          return Response.json({ error: 'Events not configured', events: [] }, { status: 503 });
        }

        // Get cursor from query params
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');

        // Query for events since cursor
        const params = buildQueryParams(cursor);
        const result = await ddbClient.send(new QueryCommand(params));
        const items = (result.Items ?? []) as Array<Record<string, unknown>>;
        const events = formatEvents(items);

        return Response.json({
          events,
          cursor: getLastCursor(events, cursor),
          hasMore: result.LastEvaluatedKey !== undefined,
        });
      },
    },
  },
});
