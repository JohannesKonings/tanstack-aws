import { createFileRoute, Link } from '@tanstack/react-router';
import { DemoPageShell } from '#apps/webapp/components/DemoPageShell';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';

export const Route = createFileRoute('/demo/db-persons/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DemoPageShell
      title="DB Persons"
      badge={<Badge variant="teal">Person</Badge>}
      backgroundStyle={{
        backgroundImage:
          'radial-gradient(50% 50% at 20% 60%, #1a1a1a 0%, #0a0a0a 50%, #000000 100%)',
      }}
      cardClassName="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <Button
          as={Link}
          to="/demo/db-persons/ddb"
          variant="gradient"
          color="purple"
          className="w-full"
        >
          DDB
        </Button>
        <Button
          as={Link}
          to="/demo/db-persons/aurora"
          variant="gradient"
          color="blue"
          className="w-full"
        >
          Aurora
        </Button>
      </div>
    </DemoPageShell>
  );
}
