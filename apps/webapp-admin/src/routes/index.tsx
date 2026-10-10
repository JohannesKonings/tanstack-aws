import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: AdminPlaceholder,
});

function AdminPlaceholder() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Admin — coming soon</h1>
        <p className="mt-3 text-zinc-400">Internal operations console for TanStack AWS Examples.</p>
      </div>
    </main>
  );
}
