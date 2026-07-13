import { QueryClient } from '@tanstack/react-query';
import superjson from 'superjson';

let cachedQueryClient: QueryClient | undefined;

export const resetQueryClientForTests = (): void => {
  cachedQueryClient = undefined;
};

export function getQueryClient(): QueryClient {
  cachedQueryClient ??= new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  });
  return cachedQueryClient;
}
