import { createAuthClient } from 'better-auth/react';
import { customSessionClient, genericOAuthClient, jwtClient } from 'better-auth/client/plugins';
import type { authInternal } from '#src/webapp/lib/auth';

const origin = typeof window !== 'undefined' ? window.location.origin : '';

/** Client for public SSO (GitHub). Points at /api/auth/public. */
export const authClientPublic = createAuthClient({
  baseURL: origin ? `${origin}/api/auth/public` : undefined,
  plugins: [jwtClient()],
});

/** Client for internal SSO (Microsoft Entra ID). Points at /api/auth/internal. */
export const authClientInternal = createAuthClient({
  baseURL: origin ? `${origin}/api/auth/internal` : undefined,
  plugins: [genericOAuthClient(), customSessionClient<typeof authInternal>(), jwtClient()],
});
