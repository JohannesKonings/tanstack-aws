/**
 * Stub for @tanstack/react-router-devtools used in SSR builds only.
 * The real package pulls in @tanstack/router-devtools-core which references
 * window at module load time (delegateEvents), causing "window is not defined"
 * in Lambda. This stub is aliased in vite.config when building the SSR bundle.
 */
export function TanStackRouterDevtoolsPanel() {
  return null;
}
