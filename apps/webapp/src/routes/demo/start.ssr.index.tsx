import { createFileRoute, Link } from '@tanstack/react-router';
import { DemoPageShell } from '#apps/webapp/components/DemoPageShell';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';

export const Route = createFileRoute('/demo/start/ssr/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DemoPageShell
      title="SSR Demos"
      badge={<Badge variant="teal">TanStack Start</Badge>}
      backgroundStyle={{
        backgroundImage:
          'radial-gradient(50% 50% at 20% 60%, #1a1a1a 0%, #0a0a0a 50%, #000000 100%)',
      }}
      cardClassName="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <Button
          as={Link}
          to="/demo/start/ssr/spa-mode"
          variant="gradient"
          color="purple"
          className="w-full"
        >
          SPA Mode
        </Button>
        <Button
          as={Link}
          to="/demo/start/ssr/full-ssr"
          variant="gradient"
          color="blue"
          className="w-full"
        >
          Full SSR
        </Button>
        <Button
          as={Link}
          to="/demo/start/ssr/data-only"
          variant="gradient"
          color="green"
          className="w-full"
        >
          Data Only
        </Button>
      </div>
    </DemoPageShell>
  );
}
