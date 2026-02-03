import { authClientInternal } from '#src/webapp/lib/auth-client';
import { createFileRoute } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useEffect, useRef } from 'react';

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
            await authClientInternal.signOut();
            window.location.href = '/sso/internal';
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}
