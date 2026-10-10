import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/demo/db-person')({
  beforeLoad: () => {
    throw redirect({ to: '/demo/db-persons/ddb' });
  },
});
