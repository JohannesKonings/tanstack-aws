import { authClientInternal } from '#src/webapp/lib/auth-client';
import { getSsoInternalValue, setSsoInternalValue } from '#src/webapp/lib/sso-value';
import { createFileRoute } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Cookie name for internal JWT (API Gateway authorizer reads this when Authorization is missing). */
export const SSO_INTERNAL_JWT_COOKIE = '__auth_jwt_internal';

export const Route = createFileRoute('/sso/internal')({
  component: SsoInternalPage,
});

function SsoInternalPage() {
  const { data: session, isPending } = authClientInternal.useSession();
  const redirectStarted = useRef(false);

  useEffect(() => {
    if (isPending || session || redirectStarted.current) return;
    redirectStarted.current = true;
    authClientInternal.signIn.social({
      provider: 'microsoft',
      callbackURL: '/sso/internal',
    });
  }, [session, isPending]);

  useEffect(() => {
    if (!session) return;
    authClientInternal.token().then((res) => {
      if (res.data?.token) {
        document.cookie = `${SSO_INTERNAL_JWT_COOKIE}=${res.data.token}; path=/; max-age=900; samesite=lax`;
      }
    });
  }, [session]);

  if (isPending) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-gray-900 text-white">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Internal section (Entra ID)</h1>
        <p className="text-gray-400 text-center max-w-md">
          Redirecting to sign in with Microsoft Entra ID…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Internal section (Entra ID)</h1>
      <p className="text-gray-400 mb-4">
        You are logged in with Microsoft Entra ID. This content is only shown
        when you are signed in.
      </p>
      <div className="bg-gray-800 rounded-lg p-4 max-w-md space-y-3">
        <p className="text-sm text-gray-300">
          <span className="font-medium text-white">User:</span>{' '}
          {session.user?.name ?? session.user?.email ?? '—'}
        </p>
        {session.user?.email && (
          <p className="text-sm text-gray-300">
            <span className="font-medium text-white">Email:</span>{' '}
            {session.user.email}
          </p>
        )}
        {'roles' in session &&
          Array.isArray((session as { roles?: string[] }).roles) &&
          (session as { roles: string[] }).roles.length > 0 && (
            <p className="text-sm text-gray-300">
              <span className="font-medium text-white">Entra ID roles:</span>{' '}
              {(session as { roles: string[] }).roles.join(', ')}
            </p>
          )}
        <button
          type="button"
          title="Sign out from Microsoft Entra ID"
          onClick={async () => {
            document.cookie = `${SSO_INTERNAL_JWT_COOKIE}=; path=/; max-age=0`;
            await authClientInternal.signOut();
            window.location.href = '/sso/internal';
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
      <SsoInternalValueSection />
    </div>
  );
}

function SsoInternalValueSection() {
  const [serverValue, setServerValue] = useState<string>('');
  const [serverInput, setServerInput] = useState('');
  const [apiValue, setApiValue] = useState<string>('');
  const [apiInput, setApiInput] = useState('');
  const [loading, setLoading] = useState<'server' | 'api' | null>(null);

  const loadServerValue = useCallback(async () => {
    const v = await getSsoInternalValue();
    setServerValue(v);
  }, []);

  const loadApiValue = useCallback(async () => {
    const res = await fetch('/api/sso/internal/value', {
      credentials: 'include', // Include cookies in the request
    });
    const data = (await res.json()) as { value?: string };
    setApiValue(typeof data?.value === 'string' ? data.value : '');
  }, []);

  useEffect(() => {
    loadServerValue();
    loadApiValue();
  }, [loadServerValue, loadApiValue]);

  const handleServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('server');
    try {
      await setSsoInternalValue({ data: serverInput });
      setServerValue(serverInput);
      setServerInput('');
      await loadServerValue();
    } finally {
      setLoading(null);
    }
  };

  const handleApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('api');
    try {
      const res = await fetch('/api/sso/internal/value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: apiInput }),
        credentials: 'include', // Include cookies in the request
      });
      const data = (await res.json()) as { value?: string };
      setApiValue(typeof data?.value === 'string' ? data.value : '');
      setApiInput('');
      await loadApiValue();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-8 space-y-8 max-w-2xl">
      <section className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-3">Server function: value</h2>
        <p className="text-sm text-gray-400 mb-2">Read (GET) and change (POST) via server function.</p>
        <p className="text-sm text-gray-300 mb-3">
          <span className="font-medium text-white">Current value:</span>{' '}
          {serverValue === '' ? '(empty)' : serverValue}
        </p>
        <form onSubmit={handleServerSubmit} className="flex gap-2">
          <input
            type="text"
            value={serverInput}
            onChange={(e) => setServerInput(e.target.value)}
            placeholder="New value"
            className="flex-1 px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-500 border border-gray-600"
          />
          <button
            type="submit"
            disabled={loading === 'server'}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading === 'server' ? 'Saving…' : 'Set'}
          </button>
        </form>
      </section>
      <section className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-3">API: value</h2>
        <p className="text-sm text-gray-400 mb-2">GET and POST /api/sso/internal/value.</p>
        <p className="text-sm text-gray-300 mb-3">
          <span className="font-medium text-white">Current value:</span>{' '}
          {apiValue === '' ? '(empty)' : apiValue}
        </p>
        <form onSubmit={handleApiSubmit} className="flex gap-2">
          <input
            type="text"
            value={apiInput}
            onChange={(e) => setApiInput(e.target.value)}
            placeholder="New value"
            className="flex-1 px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-500 border border-gray-600"
          />
          <button
            type="submit"
            disabled={loading === 'api'}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading === 'api' ? 'Saving…' : 'Set'}
          </button>
        </form>
      </section>
    </div>
  );
}
