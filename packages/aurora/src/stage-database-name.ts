const STAGE_SEPARATOR = '-';
const POSTGRES_SEPARATOR = '_';
const VALID_IDENTIFIER_START = /^[a-z_]/;

/** PostgreSQL database name for a workload stage (`main`, `prod`, `feature_checkout`). */
export const resolveStageDatabaseName = (appStage: string): string => {
  const normalized = appStage
    .toLowerCase()
    .replaceAll(STAGE_SEPARATOR, POSTGRES_SEPARATOR)
    .replace(/[^a-z0-9_]/g, POSTGRES_SEPARATOR)
    .replace(/_+/g, POSTGRES_SEPARATOR)
    .replace(/^_+|_+$/g, '');

  const fallback = 'stage';
  const base = normalized || fallback;
  return VALID_IDENTIFIER_START.test(base) ? base : `s_${base}`;
};
