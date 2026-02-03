import { authClientPublic } from '#src/webapp/lib/auth-client';
import { createFileRoute } from '@tanstack/react-router';
import { Github, LogOut } from 'lucide-react';

export const Route = createFileRoute('/sso/public')({
  component: SsoPublicPage,
});

function SsoPublicPage() {
  const { data: session, isPending } = authClientPublic.useSession();

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
            await authClientPublic.signOut();
            window.location.href = '/sso/public';
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
