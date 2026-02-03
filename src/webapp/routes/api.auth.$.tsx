import { authInternal, authPublic } from '#src/webapp/lib/auth';
import { createFileRoute } from '@tanstack/react-router';

async function authHandler(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith('/api/auth/public')) return authPublic.handler(request);
  if (pathname.startsWith('/api/auth/internal')) {
    if (pathname.includes('/callback/microsoft')) {
      console.log('[auth/internal] OAuth callback hit (Entra ID redirect). Tokens/userInfo are processed inside better-auth; result is stored in session user (see get-session log).');
    }
    const response = await authInternal.handler(request);
    // Log get-session response to debug Entra ID data (e.g. why roles is empty)
    if (pathname === '/api/auth/internal/get-session' && response.ok) {
      try {
        const clone = response.clone();
        const body = await clone.json();
        console.log('[auth/internal get-session] response:', JSON.stringify(body, null, 2));
      } catch {
        // ignore
      }
    }
    return response;
  }
  return new Response('Not found', { status: 404 });
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => authHandler(request),
      POST: ({ request }: { request: Request }) => authHandler(request),
    },
  },
});
