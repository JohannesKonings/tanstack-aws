import { createFileRoute } from '@tanstack/react-router';
import { DemoListItem, DemoPageShell } from '#apps/webapp/components/DemoPageShell';
import { Badge } from '#apps/webapp/components/ui/badge';
import { getPunkSongs } from '#apps/webapp/data/demo.punk-songs';

export const Route = createFileRoute('/demo/start/ssr/data-only')({
  ssr: 'data-only',
  component: RouteComponent,
  loader: async () => await getPunkSongs(),
});

function RouteComponent() {
  const punkSongs = Route.useLoaderData();

  return (
    <DemoPageShell
      title="Data Only SSR - Punk Songs"
      badge={<Badge variant="info">Data Only</Badge>}
      backgroundStyle={{
        backgroundImage:
          'radial-gradient(50% 50% at 20% 60%, #1a1a1a 0%, #0a0a0a 50%, #000000 100%)',
      }}
    >
      <ul className="space-y-3">
        {punkSongs.map((song) => (
          <DemoListItem key={song.id}>
            <span className="text-lg font-medium">{song.name}</span>
            <span className="text-text-muted"> - {song.artist}</span>
          </DemoListItem>
        ))}
      </ul>
    </DemoPageShell>
  );
}
