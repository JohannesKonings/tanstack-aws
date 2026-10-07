import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import webAppManifest from '../../../public/assets/manifest.json';

export const Route = createFileRoute('/manifest.json')({
  server: {
    handlers: {
      GET: () => json(webAppManifest),
    },
  },
});
