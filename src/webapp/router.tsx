import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
// oxlint-disable sort-keys
import * as TanstackQuery from './integrations/tanstack-query/root-provider';
import { routeTree } from './routeTree.gen';

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    context: { ...rqContext },
    defaultPreload: 'intent',
    Wrap: (props: { children: React.ReactNode }) => (
      <TanstackQuery.Provider {...rqContext}>{props.children}</TanstackQuery.Provider>
    ),
  });

  setupRouterSsrQueryIntegration({ queryClient: rqContext.queryClient, router });

  return router;
};
