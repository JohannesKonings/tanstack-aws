import { createFileRoute, Link } from '@tanstack/react-router';
import { Badge } from '#src/webapp/components/ui/badge';
import { Card } from '#src/webapp/components/ui/card';
import guitars from '../../data/example-guitars';

export const Route = createFileRoute('/example/guitars/')({
  component: GuitarsIndex,
});

function GuitarsIndex() {
  return (
    <div className="bg-background-default p-5 text-text-primary">
      <div className="mb-8 text-center">
        <h1 className="mb-3 text-3xl font-bold">Featured Guitars</h1>
        <Badge variant="teal">TanStack AI Demo</Badge>
      </div>
      <div className="flex flex-wrap justify-center gap-12">
        {guitars.map((guitar) => (
          <div
            key={guitar.id}
            className="group relative mb-24 w-full md:w-[calc(50%-1.5rem)] xl:w-[calc(33.333%-2rem)]"
          >
            <Link
              to="/example/guitars/$guitarId"
              params={{
                guitarId: guitar.id.toString(),
              }}
            >
              <div className="relative z-0 mb-8 aspect-square w-full">
                <div className="h-full w-full overflow-hidden rounded-2xl border-4 border-border-default shadow-2xl">
                  <img
                    src={guitar.image}
                    alt={guitar.name}
                    className="guitar-image h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-full bg-lib-start/80 px-4 py-2 text-sm font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                  View Details
                </div>
              </div>

              <Card className="absolute bottom-0 right-0 z-10 w-[80%] translate-y-[40%] transform border-border-default bg-background-surface/95 p-5 shadow-xl backdrop-blur-md">
                <h2 className="mb-2 text-xl font-bold">{guitar.name}</h2>
                <p className="mb-3 line-clamp-2 text-text-secondary">{guitar.shortDescription}</p>
                <div className="text-xl font-bold text-lib-start">${guitar.price}</div>
              </Card>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
