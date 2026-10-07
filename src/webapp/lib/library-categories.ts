export type LibraryCategory = 'framework' | 'data' | 'ui' | 'performance' | 'tooling';

/** Library id → category. Any id not listed defaults to tooling (see categoryOf). */
export const libraryCategories: Record<string, LibraryCategory> = {
  start: 'framework',
  router: 'framework',
  query: 'data',
  db: 'data',
  store: 'data',
  ai: 'data',
  table: 'ui',
  charts: 'ui',
  form: 'ui',
  hotkeys: 'ui',
  markdown: 'ui',
  highlight: 'ui',
  virtual: 'performance',
  pacer: 'performance',
  devtools: 'tooling',
  config: 'tooling',
  cli: 'tooling',
  intent: 'tooling',
  ranger: 'tooling',
};

export function categoryOf(id: string): LibraryCategory {
  return libraryCategories[id] ?? 'tooling';
}

/** Mode-aware category text color utility (400 in light, 300/200 in dark). */
export const categoryTextColor: Record<LibraryCategory, string> = {
  framework: 'text-category-framework',
  data: 'text-category-data',
  ui: 'text-category-ui',
  performance: 'text-category-performance',
  tooling: 'text-category-tooling',
};
