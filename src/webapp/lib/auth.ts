import { betterAuth } from 'better-auth';
import { customSession } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

const secret = process.env.BETTER_AUTH_SECRET ?? 'dev-secret-min-32-chars-long-for-local';
const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

const sessionConfig = {
  cookieCache: {
    enabled: true,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    strategy: 'compact' as const, // smaller cookies to avoid 431 (header too large)
    refreshCache: true,
  },
};

const accountConfig = {
  storeStateStrategy: 'cookie' as const,
  storeAccountCookie: false,
};

/** Public SSO: GitHub only. Used for /sso/public. */
export const authPublic = betterAuth({
  basePath: '/api/auth/public',
  secret,
  baseURL: baseUrl,
  session: sessionConfig,
  account: accountConfig,
  advanced: {
    cookiePrefix: 'better-auth-public',
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
  },
  plugins: [tanstackStartCookies()],
});

/** Internal SSO: Microsoft Entra ID only. Used for /sso/internal. */
export const authInternal = betterAuth({
  basePath: '/api/auth/internal',
  secret,
  baseURL: baseUrl,
  session: sessionConfig,
  account: accountConfig,
  advanced: {
    cookiePrefix: 'better-auth-internal',
  },
  user: {
    additionalFields: {
      roles: {
        type: 'string',
        input: false, // set from Entra ID via mapProfileToUser, JSON string for stateless
      },
    },
  },
  socialProviders: {
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID ?? '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
      tenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',
      authority: 'https://login.microsoftonline.com',
      mapProfileToUser: (profile) => {
        return {
          roles: JSON.stringify(profile.roles), 
        };
      },
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      const u = user as { roles?: string };
      let roles: string[] = [];
      if (typeof u.roles === 'string') {
        try {
          const parsed = JSON.parse(u.roles) as unknown;
          roles = Array.isArray(parsed) ? (parsed as string[]) : [];
        } catch {
          roles = [];
        }
      }
      return { user, session, roles };
    }),
    tanstackStartCookies(),
  ],
});
