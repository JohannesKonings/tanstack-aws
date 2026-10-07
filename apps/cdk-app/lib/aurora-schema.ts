const SCHEMA_SEPARATOR = '-';
const POSTGRES_SEPARATOR = '_';
const VALID_IDENTIFIER_START = /^[a-z_]/;

export const resolveAuroraSchemaName = (appStage: string): string => {
  const normalized = appStage
    .toLowerCase()
    .replaceAll(SCHEMA_SEPARATOR, POSTGRES_SEPARATOR)
    .replace(/[^a-z0-9_]/g, POSTGRES_SEPARATOR)
    .replace(/_+/g, POSTGRES_SEPARATOR)
    .replace(/^_+|_+$/g, '');

  const fallback = 'stage';
  const base = normalized || fallback;
  return VALID_IDENTIFIER_START.test(base) ? base : `s_${base}`;
};
