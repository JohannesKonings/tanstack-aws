import { createFileRoute } from '@tanstack/react-router';
import robotsTxt from '../../../public/assets/robots.txt?raw';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(robotsTxt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }),
    },
  },
});
