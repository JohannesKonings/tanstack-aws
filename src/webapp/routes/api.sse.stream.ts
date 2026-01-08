// oxlint-disable func-style
// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
// oxlint-disable max-statements
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createFileRoute } from '@tanstack/react-router';

// =============================================================================
// Constants
// =============================================================================

const EVENTS_TABLE = process.env.EVENTS_TABLE ?? '';
const POLL_INTERVAL_MS = 500;
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_STREAM_DURATION_MS = 840000; // 14 minutes

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
  const params = {
    TableName: EVENTS_TABLE,
    KeyConditionExpression: lastEventSk ? 'pk = :pk AND sk > :sk' : 'pk = :pk',
    ExpressionAttributeValues: lastEventSk
      ? { ':pk': 'EVENTS', ':sk': lastEventSk }
      : { ':pk': 'EVENTS' },
    ScanIndexForward: true,
  };

  const result = await ddbClient.send(new QueryCommand(params));
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
// SSE Stream Handler
// =============================================================================

/**
 * SSE Stream API Route
 *
 * Streams entity change events to connected clients using Server-Sent Events.
 * Uses long-polling against the Events table to detect new changes.
 */
export const Route = createFileRoute('/api/sse/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Check if Events table is configured
        if (!EVENTS_TABLE) {
          return new Response('SSE not configured', { status: 503 });
        }

        // Get last event ID from header for reconnection
        const lastEventId = request.headers.get('Last-Event-ID');
        let lastSk = lastEventId;

        // Create a readable stream for SSE
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();

            // Send initial connected event
            controller.enqueue(
              encoder.encode('event: connected\ndata: {"status":"connected"}\n\n'),
            );

            const startTime = Date.now();
            let lastHeartbeat = Date.now();

            // Poll loop
            const poll = async (): Promise<void> => {
              // Check if we should stop
              if (Date.now() - startTime > MAX_STREAM_DURATION_MS) {
                controller.enqueue(
                  encoder.encode('event: reconnect\ndata: {"reason":"timeout"}\n\n'),
                );
                controller.close();
                return;
              }

              // Query for new events
              const events = await queryEventsSince(lastSk);

              // Send events
              for (const event of events) {
                controller.enqueue(encoder.encode(formatSseEvent(event)));
                lastSk = event.sk as string;
              }

              // Send heartbeat if needed
              if (Date.now() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
                lastHeartbeat = Date.now();
              }

              // Schedule next poll
              await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
              await poll();
            };

            // Start polling (catch errors to close stream gracefully)
            poll().catch(() => {
              controller.close();
            });
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
