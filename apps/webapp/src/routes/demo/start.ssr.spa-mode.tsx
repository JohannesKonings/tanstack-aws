import { createFileRoute } from '@tanstack/react-router';
// oxlint-disable func-style
import { useEffect, useState } from 'react';
import { DemoListItem, DemoPageShell } from '#apps/webapp/components/DemoPageShell';
import { Badge } from '#apps/webapp/components/ui/badge';
import { getPunkSongs } from '#apps/webapp/data/demo.punk-songs';

export const Route = createFileRoute('/demo/start/ssr/spa-mode')({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  const [punkSongs, setPunkSongs] = useState<Awaited<ReturnType<typeof getPunkSongs>>[number][]>(
    () => [],
  );

  useEffect(() => {
    getPunkSongs().then(setPunkSongs);
  }, []);

  return (
    <DemoPageShell
      title="SPA Mode - Punk Songs"
      badge={<Badge variant="success">SPA Mode</Badge>}
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
