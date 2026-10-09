import { createFileRoute, Link } from '@tanstack/react-router';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Card } from '#apps/webapp/components/ui/card';
import guitars from '../../data/example-guitars';

export const Route = createFileRoute('/example/guitars/$guitarId')({
  component: RouteComponent,
  loader: async ({ params }) => {
    const guitar = guitars.find((guitar) => guitar.id === +params.guitarId);
    if (!guitar) {
      throw new Error('Guitar not found');
    }
    return guitar;
  },
});

function RouteComponent() {
  const guitar = Route.useLoaderData();

  return (
    <div className="relative flex min-h-[100vh] items-center bg-background-default p-5 text-text-primary">
      <Card className="relative z-10 w-[60%] border-border-default bg-background-surface/95 p-8 shadow-xl backdrop-blur-md">
        <Button as={Link} to="/example/guitars" variant="link" color="green" className="mb-4">
          &larr; Back to all guitars
        </Button>
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-3xl font-bold">{guitar.name}</h1>
          <Badge variant="teal">Guitar Demo</Badge>
        </div>
        <p className="mb-6 text-text-secondary">{guitar.description}</p>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-lib-start">${guitar.price}</div>
          <Button color="green">Add to Cart</Button>
        </div>
      </Card>

      <div className="absolute top-0 right-0 z-0 h-full w-[55%]">
        <div className="h-full w-full overflow-hidden rounded-2xl border-4 border-border-default shadow-2xl">
          <img
            src={guitar.image}
            alt={guitar.name}
            className="guitar-image h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
