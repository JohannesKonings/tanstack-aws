import { createFileRoute } from '@tanstack/react-router';
import { getStoredValue, setStoredValue } from '#src/webapp/lib/sso-value';

export const Route = createFileRoute('/api/sso/public/value')({
  server: {
    handlers: {
      GET: () => Response.json({ value: getStoredValue('public') }),
      POST: async ({ request }) => {
        const body = (await request.json()) as { value?: string };
        const value = typeof body?.value === 'string' ? body.value : '';
        setStoredValue('public', value);
        return Response.json({ value });
      },
    },
  },
});
