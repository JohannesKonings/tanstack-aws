import { authClientPublic } from '#src/webapp/lib/auth-client';
import { getSsoPublicValue, setSsoPublicValue } from '#src/webapp/lib/sso-value';
import { createFileRoute } from '@tanstack/react-router';
import { Github, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

/** Cookie name for public JWT (API Gateway authorizer reads this when Authorization is missing). */
export const SSO_PUBLIC_JWT_COOKIE = '__auth_jwt_public';

export const Route = createFileRoute('/sso/public')({
  component: SsoPublicPage,
});

function SsoPublicPage() {
  const { data: session, isPending } = authClientPublic.useSession();

  useEffect(() => {
    if (!session) return;
    authClientPublic.token().then((res) => {
      if (res.data?.token) {
        document.cookie = `${SSO_PUBLIC_JWT_COOKIE}=${res.data.token}; path=/; max-age=900; samesite=lax`;
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
        <h1 className="text-2xl font-bold mb-4">Public section (GitHub)</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Sign in with GitHub to view this section.
        </p>
        <button
          type="button"
          title="Sign in with GitHub"
          onClick={() =>
            authClientPublic.signIn.social({
              provider: 'github',
              callbackURL: '/sso/public',
            })
          }
          className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Github size={20} />
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Public section (GitHub)</h1>
      <p className="text-gray-400 mb-4">
        You are logged in with GitHub. This content is only shown when you are
        signed in.
      </p>
      <div className="bg-gray-800 rounded-lg p-4 max-w-md space-y-4">
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
        <button
          type="button"
          title="Sign out from GitHub"
          onClick={async () => {
            document.cookie = `${SSO_PUBLIC_JWT_COOKIE}=; path=/; max-age=0`;
            await authClientPublic.signOut();
            window.location.href = '/sso/public';
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
      <SsoPublicValueSection />
    </div>
  );
}

function SsoPublicValueSection() {
  const [serverValue, setServerValue] = useState<string>('');
  const [serverInput, setServerInput] = useState('');
  const [apiValue, setApiValue] = useState<string>('');
  const [apiInput, setApiInput] = useState('');
  const [loading, setLoading] = useState<'server' | 'api' | null>(null);

  const loadServerValue = useCallback(async () => {
    const v = await getSsoPublicValue();
    setServerValue(v);
  }, []);

  const loadApiValue = useCallback(async () => {
    const res = await fetch('/api/sso/public/value', {
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
      await setSsoPublicValue({ data: serverInput });
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
      const res = await fetch('/api/sso/public/value', {
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
        <p className="text-sm text-gray-400 mb-2">GET and POST /api/sso/public/value.</p>
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
