// oxlint-disable no-magic-numbers
// oxlint-disable init-declarations
import { createFileRoute } from '@tanstack/react-router';
import { TIMEOUT_IN_SECONDS } from '../../../../lib/constructs/type';

const STREAM_DURATION_MS = (TIMEOUT_IN_SECONDS - 4) * 1000;
// Recommended retry delay for EventSource (in milliseconds)
const RETRY_MS = 1000;

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async () => {
        const encoder = new TextEncoder();
        let intervalId: ReturnType<typeof setInterval>;
        let timeoutId: ReturnType<typeof setTimeout>;

        const stream = new ReadableStream({
          start(controller) {
            // Send retry directive so EventSource knows how long to wait before reconnecting
            controller.enqueue(encoder.encode(`retry: ${RETRY_MS}\n\n`));

            // Send time every second
            intervalId = setInterval(() => {
              const data = { time: new Date().toISOString() };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
              console.log('Sent event:', data);
            }, 30_000);

            // Gracefully close the stream before Lambda timeout
            // EventSource will automatically reconnect
            timeoutId = setTimeout(() => {
              clearInterval(intervalId);
              // Send a final event to signal graceful close
              controller.enqueue(encoder.encode(`event: reconnect\ndata: {}\n\n`));
              controller.close();
              console.log('Stream closed gracefully before timeout');
            }, STREAM_DURATION_MS);
          },
          cancel() {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      },
    },
  },
});
