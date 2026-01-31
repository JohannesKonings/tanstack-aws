/**
 * Stub for @tanstack/react-ai-devtools used in SSR builds only.
 * The real package pulls in @tanstack/ai-devtools-core which uses Solid.js;
 * solid-js/web dist/server.js does not export setStyleProperty, causing the build to fail.
 * This stub is aliased in vite.config when building the SSR bundle.
 */
export function aiDevtoolsPlugin() {
  return {
    name: 'TanStack AI',
    render: () => null,
  };
}
