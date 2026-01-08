import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EVENTS_TABLE = process.env.EVENTS_TABLE!;

// Duration constants in milliseconds
const MAX_DURATION_MS = 840000; // 14 minutes (leave 1 min buffer for 15 min limit)
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const POLL_INTERVAL_MS = 500; // Poll every 500ms for new events
const QUERY_LIMIT = 100; // Max events per query

interface EventItem {
  sk: string;
  eventId: string;
  eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
  entityType: string;
  entity: Record<string, unknown> | null;
  oldEntity: Record<string, unknown> | null;
  createdAt: string;
}

interface SseEvent {
  queryStringParameters?: Record<string, string | undefined> | null;
  headers?: Record<string, string | undefined> | null;
}

interface SseResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Build query parameters for Events table
 */
const buildQueryParams = (cursor: string | null): QueryCommandInput => {
  const baseParams: QueryCommandInput = {
    TableName: EVENTS_TABLE,
    Limit: QUERY_LIMIT,
    ExpressionAttributeValues: {
      ':pk': 'EVENTS',
    },
  };

  if (cursor) {
    return {
      ...baseParams,
      KeyConditionExpression: 'pk = :pk AND sk > :cursor',
      ExpressionAttributeValues: {
        ':pk': 'EVENTS',
        ':cursor': cursor,
      },
    };
  }

  return {
    ...baseParams,
    KeyConditionExpression: 'pk = :pk',
  };
};

/**
 * Query events from the Events table since the given cursor
 */
const queryEventsSince = async (cursor: string | null): Promise<EventItem[]> => {
  const params = buildQueryParams(cursor);
  const result = await ddbClient.send(new QueryCommand(params));
  return (result.Items ?? []) as EventItem[];
};

/**
 * Format an event as SSE (Server-Sent Events) format
 *
 * SSE format:
 * id: <event_id>\n
 * event: <event_type>\n
 * data: <json_data>\n\n
 */
const formatSseEvent = (event: EventItem): string => {
  const data = JSON.stringify({
    eventId: event.eventId,
    eventType: event.eventType,
    entityType: event.entityType,
    entity: event.entity,
    oldEntity: event.oldEntity,
    timestamp: event.createdAt,
  });

  return `id: ${event.sk}\nevent: change\ndata: ${data}\n\n`;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get the last event ID from request headers or query params
 */
const getLastEventId = (event: SseEvent): string | null => {
  const fromQuery = event.queryStringParameters?.lastEventId;
  const fromHeaderUpper = event.headers?.['Last-Event-ID'];
  const fromHeaderLower = event.headers?.['last-event-id'];
  return fromQuery || fromHeaderUpper || fromHeaderLower || null;
};

/**
 * Build SSE response headers
 */
const buildSseHeaders = (): Record<string, string> => ({
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Last-Event-ID',
});

/**
 * SSE Handler (Non-Streaming Mode)
 *
 * Returns current events for clients that don't support streaming.
 * For full streaming support, use streamingHandler with API Gateway
 * response streaming enabled.
 *
 * @see docs/PLAN-DB-PERSONS.md Section 15B for architecture details
 */
export const handler = async (event: SseEvent): Promise<SseResponse> => {
  const lastEventId = getLastEventId(event);

  // Build SSE response body
  let responseBody = 'event: connected\ndata: {"status":"connected"}\n\n';

  // If reconnecting, send missed events
  if (lastEventId) {
    const missedEvents = await queryEventsSince(lastEventId);
    for (const evt of missedEvents) {
      responseBody += formatSseEvent(evt);
    }
  }

  return {
    statusCode: 200,
    headers: buildSseHeaders(),
    body: responseBody,
  };
};

type HttpStream = NodeJS.WritableStream & { write: (data: string) => void; end: () => void };

interface StreamLoopState {
  cursor: string | null;
  lastHeartbeat: number;
  startTime: number;
}

/**
 * Send missed events to the client after reconnection
 */
const sendMissedEvents = async (httpStream: HttpStream, state: StreamLoopState): Promise<void> => {
  if (!state.cursor) {
    return;
  }

  const missedEvents = await queryEventsSince(state.cursor);
  for (const evt of missedEvents) {
    httpStream.write(formatSseEvent(evt));
    state.cursor = evt.sk;
  }
};

/**
 * Send heartbeat if needed to keep connection alive
 */
const sendHeartbeatIfNeeded = (httpStream: HttpStream, state: StreamLoopState): void => {
  if (Date.now() - state.lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
    httpStream.write(': heartbeat\n\n');
    state.lastHeartbeat = Date.now();
  }
};

/**
 * Process new events in a single poll iteration
 */
const pollAndSendEvents = async (httpStream: HttpStream, state: StreamLoopState): Promise<void> => {
  const newEvents = await queryEventsSince(state.cursor);

  for (const evt of newEvents) {
    httpStream.write(formatSseEvent(evt));
    state.cursor = evt.sk;
  }
};

/**
 * Check if the streaming loop should continue
 */
const shouldContinueLoop = (state: StreamLoopState): boolean =>
  Date.now() - state.startTime < MAX_DURATION_MS;

/**
 * Process events in the streaming loop
 */
const processStreamingLoop = async (
  httpStream: HttpStream,
  initialCursor: string | null,
): Promise<void> => {
  const state: StreamLoopState = {
    cursor: initialCursor,
    lastHeartbeat: Date.now(),
    startTime: Date.now(),
  };

  // If reconnecting, first send any missed events
  await sendMissedEvents(httpStream, state);

  // Long-poll for new events until timeout
  while (shouldContinueLoop(state)) {
    sendHeartbeatIfNeeded(httpStream, state);

    // Query for new events - await in loop is intentional for polling
    // oxlint-disable-next-line no-await-in-loop
    await pollAndSendEvents(httpStream, state);

    // Small delay before next poll - await in loop is intentional
    // oxlint-disable-next-line no-await-in-loop
    await sleep(POLL_INTERVAL_MS);
  }

  // Send reconnect hint before closing
  httpStream.write('event: reconnect\ndata: {"reason":"timeout"}\n\n');
  httpStream.end();
};

/**
 * Streaming handler for Lambda Response Streaming
 *
 * This is the primary handler when using API Gateway with response streaming enabled.
 * It maintains a long-lived connection and pushes events as they occur.
 */
export const streamingHandler = awslambda.streamifyResponse(
  async (
    event: SseEvent,
    responseStream: NodeJS.WritableStream,
    _context: unknown,
  ): Promise<void> => {
    const lastEventId = getLastEventId(event);

    // Set SSE headers via HttpResponseStream wrapper
    // @ts-expect-error - awslambda global is available at runtime
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: buildSseHeaders(),
    });

    // Send connection confirmation
    httpStream.write('event: connected\ndata: {"status":"connected"}\n\n');

    await processStreamingLoop(httpStream, lastEventId);
  },
);
