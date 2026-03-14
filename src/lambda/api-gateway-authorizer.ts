import { createRemoteJWKSet, jwtVerify } from 'jose';

/** Cookie names set by the client for SSO paths (must match routes). */
const SSO_PUBLIC_JWT_COOKIE = '__auth_jwt_public';
const SSO_INTERNAL_JWT_COOKIE = '__auth_jwt_internal';

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
type JwksEntry = { jwks: ReturnType<typeof createRemoteJWKSet>; at: number };
const jwksCache: { public?: JwksEntry; internal?: JwksEntry } = {};

function getJwks(kind: 'public' | 'internal', baseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const now = Date.now();
  const cached = jwksCache[kind];
  if (cached && now - cached.at < JWKS_CACHE_TTL_MS) return cached.jwks;
  const url = kind === 'public' ? `${baseUrl}/api/auth/public/jwks` : `${baseUrl}/api/auth/internal/jwks`;
  const jwks = createRemoteJWKSet(new URL(url));
  jwksCache[kind] = { jwks, at: now };
  return jwks;
}

function getTokenFromRequest(headers: Record<string, string | undefined> | null, cookieName: string): string | null {
  const auth = headers?.authorization ?? headers?.Authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || null;
  const cookie = headers?.cookie ?? headers?.Cookie;
  if (!cookie) return null;
  const match = new RegExp(`${escapeRegExp(cookieName)}=([^;]+)`).exec(cookie);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface RequestAuthorizerEvent {
  type: 'REQUEST';
  methodArn: string;
  path?: string;
  httpMethod?: string;
  headers?: Record<string, string | undefined> | null;
  multiValueHeaders?: Record<string, string[] | undefined> | null;
  requestContext?: { path?: string };
  // When using identitySources, headers may be passed as individual properties
  cookie?: string;
  Cookie?: string;
  authorization?: string;
  Authorization?: string;
}

interface PolicyDocument {
  Version: '2012-10-17';
  Statement: { Action: string; Effect: 'Allow' | 'Deny'; Resource: string }[];
}

/**
 * Get API base URL from environment variable, SSM parameter, or derive from methodArn.
 * methodArn format: arn:aws:execute-api:region:accountId:apiId/stage/method/path
 */
async function getBaseUrl(methodArn: string): Promise<string> {
  // First check environment variable
  const envUrl = process.env.API_BASE_URL ?? process.env.BETTER_AUTH_URL ?? '';
  if (envUrl) return envUrl.replace(/\/$/, '');

  // Then check SSM parameter if configured
  const ssmParameterName = process.env.SSM_PARAMETER_NAME;
  if (ssmParameterName) {
    try {
      const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');
      const ssmClient = new SSMClient({});
      const command = new GetParameterCommand({ Name: ssmParameterName });
      const response = await ssmClient.send(command);
      if (response.Parameter?.Value) {
        return response.Parameter.Value.replace(/\/$/, '');
      }
    } catch (err) {
      console.warn('API_GATEWAY_AUTHORIZER: Failed to read SSM parameter', err);
      // Fall through to derive from methodArn
    }
  }

  // Finally, derive from methodArn
  const parts = methodArn.split(':');
  if (parts.length < 6) return '';
  const apiPart = parts[5];
  const [apiId, stage] = apiPart.split('/');
  const region = parts[3];
  return `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}`;
}

export async function handler(event: RequestAuthorizerEvent): Promise<{ principalId: string; policyDocument: PolicyDocument } | string> {
  const path = event.path ?? event.requestContext?.path ?? '';
  const method = event.httpMethod ?? 'GET';
  
  // Headers can come from multiple sources:
  // 1. event.headers (standard)
  // 2. event properties directly (when using identitySources)
  // 3. event.multiValueHeaders (for multi-value headers)
  const headers: Record<string, string | undefined> = {
    ...(event.headers ?? {}),
    ...(event.cookie ? { cookie: event.cookie } : {}),
    ...(event.Cookie ? { Cookie: event.Cookie } : {}),
    ...(event.authorization ? { authorization: event.authorization } : {}),
    ...(event.Authorization ? { Authorization: event.Authorization } : {}),
  };
  
  const baseUrl = await getBaseUrl(event.methodArn);
  if (!baseUrl) {
    console.error('API_GATEWAY_AUTHORIZER: could not determine base URL from methodArn, env, or SSM');
    throw new Error('Unauthorized: Unable to determine API base URL');
  }

  // Allow auth endpoints
  if (path.startsWith('/api/auth')) return allow(event.methodArn);

  // Only protect API routes - page routes (/sso/public, /sso/internal) handle their own auth
  if (path.startsWith('/api/sso/public')) {
    // Accept either public or internal JWT (user may have only internal cookie set, or both)
    const token =
      getTokenFromRequest(headers, SSO_PUBLIC_JWT_COOKIE) ??
      getTokenFromRequest(headers, SSO_INTERNAL_JWT_COOKIE);
    if (!token) {
      console.warn('API_GATEWAY_AUTHORIZER: Missing public or internal token', { path });
      throw new Error('Unauthorized: Missing authentication token. Please sign in to access this resource.');
    }
    const base = baseUrl.replace(/\/$/, '');
    // Try public JWKS first (public token), then internal (internal token)
    try {
      const jwksPublic = getJwks('public', base);
      await jwtVerify(token, jwksPublic, { issuer: base, audience: base });
      return allow(event.methodArn);
    } catch {
      try {
        const jwksInternal = getJwks('internal', base);
        await jwtVerify(token, jwksInternal, { issuer: base, audience: base });
        return allow(event.methodArn);
      } catch (err) {
        console.warn('API_GATEWAY_AUTHORIZER: public API JWT verification failed', err);
        throw new Error('Unauthorized: Invalid or expired authentication token. Please sign in again.');
      }
    }
  }

  if (path.startsWith('/api/sso/internal')) {
    const token = getTokenFromRequest(headers, SSO_INTERNAL_JWT_COOKIE);
    if (!token) {
      console.warn('API_GATEWAY_AUTHORIZER: Missing internal token', { path });
      throw new Error('Unauthorized: Missing authentication token. Please sign in with Microsoft Entra ID to access this resource.');
    }
    try {
      const jwks = getJwks('internal', baseUrl.replace(/\/$/, ''));
      const { payload } = await jwtVerify(token, jwks, { issuer: baseUrl, audience: baseUrl });
      // Normalize roles: may be string[] or JSON string from different auth backends
      const rawRoles = payload.roles;
      let roles: string[] = [];
      if (Array.isArray(rawRoles)) {
        roles = rawRoles.map((r) => (typeof r === 'string' ? r : String(r)));
      } else if (typeof rawRoles === 'string') {
        try {
          const parsed = JSON.parse(rawRoles) as unknown;
          roles = Array.isArray(parsed) ? parsed.map((r) => String(r)) : [rawRoles];
        } catch {
          roles = [rawRoles];
        }
      }
      const isAdmin = roles.includes('admin');
      const isViewer = roles.includes('viewer');
      if (isAdmin) return allow(event.methodArn);
      if (isViewer && method === 'GET') return allow(event.methodArn);
      throw new Error(`Unauthorized: Insufficient permissions. This resource requires admin role for ${method} requests. Your roles: ${roles.length > 0 ? roles.join(', ') : 'none'}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Unauthorized:')) {
        throw err;
      }
      console.warn('API_GATEWAY_AUTHORIZER: internal JWT verification failed', err);
      throw new Error('Unauthorized: Invalid or expired authentication token. Please sign in again.');
    }
  }

  return allow(event.methodArn);
}

function allow(methodArn: string): { principalId: string; policyDocument: PolicyDocument } {
  return {
    principalId: 'authorized',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: 'Allow', Resource: methodArn }],
    },
  };
}

function deny(methodArn: string): { principalId: string; policyDocument: PolicyDocument } {
  return {
    principalId: 'unauthorized',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: 'Deny', Resource: methodArn }],
    },
  };
}
