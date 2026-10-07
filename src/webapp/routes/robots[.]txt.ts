import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFileRoute } from '@tanstack/react-router';

const robotsTxtPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../public/assets/robots.txt',
);
const robotsTxt = readFileSync(robotsTxtPath, 'utf-8');

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
