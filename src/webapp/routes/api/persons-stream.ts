// oxlint-disable no-magic-numbers
// oxlint-disable init-declarations
// oxlint-disable no-ternary
// oxlint-disable max-statements
// oxlint-disable no-console
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createFileRoute } from '@tanstack/react-router';
import { TIMEOUT_IN_SECONDS } from '../../../../lib/constructs/type';

// =============================================================================
// Constants
// =============================================================================

const STREAM_DURATION_MS = (TIMEOUT_IN_SECONDS - 4) * 1000;
const RETRY_MS = 1000;
const POLL_INTERVAL_MS = 500;
const HEARTBEAT_INTERVAL_MS = 15000; // Send heartbeat every 15 seconds to prevent connection timeout
const EVENTS_TABLE = process.env.EVENTS_TABLE ?? '';

// =============================================================================
// DynamoDB Client
// =============================================================================

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// =============================================================================
// Helper Functions
// =============================================================================

/** Query events from the Events table since a given sort key */
const queryEventsSince = async (
  lastEventSk: string | null,
): Promise<Array<Record<string, unknown>>> => {
  if (!EVENTS_TABLE) {
    console.log('Persons SSE: EVENTS_TABLE not configured');
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

  console.log('Persons SSE: Querying events table:', EVENTS_TABLE, 'cursor:', lastEventSk);
  const result = await ddbClient.send(new QueryCommand(params));
  console.log('Persons SSE: Query returned', result.Items?.length ?? 0, 'events');
  return (result.Items ?? []) as Array<Record<string, unknown>>;
};

/** Format an event as SSE data */
const formatSseEvent = (event: Record<string, unknown>): string => {
  const data = {
    timestamp: event.createdAt,
    eventType: event.eventType,
    entityType: event.entityType,
    entity: event.entity,
    oldEntity: event.oldEntity,
  };
  return `event: change\nid: ${event.sk}\ndata: ${JSON.stringify(data)}\n\n`;
};

// =============================================================================
// SSE Stream Route for Persons DB
// =============================================================================

/**
 * SSE Stream API Route for Persons Database
 *
 * Streams entity change events (persons, addresses, bank accounts, etc.)
 * to connected clients using Server-Sent Events.
 *
 * Based on the simple /api/events blueprint pattern.
 */
export const Route = createFileRoute('/api/persons-stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Check if Events table is configured
        if (!EVENTS_TABLE) {
          return new Response('SSE not configured - EVENTS_TABLE not set', { status: 503 });
        }

        // Get last event ID from header for reconnection
        const lastEventId = request.headers.get('Last-Event-ID');
        let lastSk = lastEventId;

        const encoder = new TextEncoder();
        let pollIntervalId: ReturnType<typeof setInterval>;
        let heartbeatIntervalId: ReturnType<typeof setInterval>;
        let timeoutId: ReturnType<typeof setTimeout>;

        const stream = new ReadableStream({
          async start(controller) {
            // Send retry directive so EventSource knows how long to wait before reconnecting
            controller.enqueue(encoder.encode(`retry: ${RETRY_MS}\n\n`));

            // Send initial connected event
            controller.enqueue(
              encoder.encode('event: connected\ndata: {"status":"connected"}\n\n'),
            );
            console.log('Persons SSE: Client connected, EVENTS_TABLE:', EVENTS_TABLE);

            // Define the poll function
            const poll = async (): Promise<void> => {
              try {
                // Query for new events
                const events = await queryEventsSince(lastSk);

                // Send each event
                for (const event of events) {
                  controller.enqueue(encoder.encode(formatSseEvent(event)));
                  lastSk = event.sk as string;
                  console.log('Persons SSE: Sent event:', event.eventType, event.entityType);
                }
              } catch (error) {
                console.error('Persons SSE: Poll error:', error);
              }
            };

            // Define the heartbeat function
            const sendHeartbeat = (): void => {
              try {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
                console.log('Persons SSE: Heartbeat sent');
              } catch (error) {
                console.error('Persons SSE: Heartbeat error:', error);
              }
            };

            // Do an immediate first poll
            await poll();

            // Then poll at regular intervals
            pollIntervalId = setInterval(() => {
              poll();
            }, POLL_INTERVAL_MS);

            // Send heartbeats at regular intervals to keep connection alive
            heartbeatIntervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

            // Gracefully close the stream before Lambda timeout
            // EventSource will automatically reconnect
            timeoutId = setTimeout(() => {
              clearInterval(pollIntervalId);
              clearInterval(heartbeatIntervalId);
              // Send a final event to signal graceful close
              controller.enqueue(
                encoder.encode('event: reconnect\ndata: {"reason":"timeout"}\n\n'),
              );
              controller.close();
              console.log('Persons SSE: Stream closed gracefully before timeout');
            }, STREAM_DURATION_MS);
          },
          cancel() {
            clearInterval(pollIntervalId);
            clearInterval(heartbeatIntervalId);
            clearTimeout(timeoutId);
            console.log('Persons SSE: Client disconnected');
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        });
      },
    },
  },
});
