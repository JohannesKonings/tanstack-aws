import type { QueryClient } from '@tanstack/react-query';
// oxlint-disable func-style
import { createTRPCClient, httpBatchStreamLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import superjson from 'superjson';
import {
  getQueryClient,
  resetQueryClientForTests,
} from '#src/webapp/integrations/tanstack-query/query-client';
import { TRPCProvider } from '#src/webapp/integrations/trpc/react';
import type { TRPCRouter } from '#src/webapp/integrations/trpc/router';

function getUrl() {
  // Always use relative URL for consistency between SSR and client
  // TanStack Start will handle the request properly in both contexts
  return '/api/trpc';
}

const trpcClient = createTRPCClient<TRPCRouter>({
  links: [
    httpBatchStreamLink({
      transformer: superjson,
      url: getUrl(),
    }),
  ],
});

type QueryContext = {
  queryClient: QueryClient;
  trpc: ReturnType<typeof createTRPCOptionsProxy<TRPCRouter>>;
};

let cachedContext: QueryContext | undefined;

const createContext = (): QueryContext => {
  const queryClient = getQueryClient();

  const serverHelpers = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient: queryClient,
  });
  return {
    queryClient,
    trpc: serverHelpers,
  };
};

export const resetQueryContextForTests = (): void => {
  cachedContext = undefined;
  resetQueryClientForTests();
};

export function getContext() {
  cachedContext ??= createContext();
  return cachedContext;
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  );
}
