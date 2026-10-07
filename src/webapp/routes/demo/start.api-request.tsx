import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DemoListItem, DemoPageShell } from '#src/webapp/components/DemoPageShell';
import { Badge } from '#src/webapp/components/ui/badge';

function getNames() {
  return fetch('/demo/api/names').then((res) => res.json() as Promise<string[]>);
}

export const Route = createFileRoute('/demo/start/api-request')({
  component: Home,
});

function Home() {
  const { data: names = [] } = useQuery({
    queryKey: ['names'],
    queryFn: getNames,
  });

  return (
    <DemoPageShell
      title="Start API Request Demo - Names List"
      badge={<Badge variant="teal">TanStack Start</Badge>}
      backgroundStyle={{
        backgroundColor: '#000',
        backgroundImage:
          'radial-gradient(ellipse 60% 60% at 0% 100%, #444 0%, #222 60%, #000 100%)',
      }}
    >
      <ul className="space-y-2">
        {names.map((name) => (
          <DemoListItem key={name}>
            <span className="text-lg">{name}</span>
          </DemoListItem>
        ))}
      </ul>
    </DemoPageShell>
  );
}
