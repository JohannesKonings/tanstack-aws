export const PERMANENT_STAGE_NAMES = ['main', 'prod'] as const;

export type StageLifecycle = 'ephemeral' | 'permanent';

const DEFAULT_FALLBACK_STAGE = 'dev';
const DEFAULT_MAX_STAGE_LENGTH = 40;
const DEFAULT_EPHEMERAL_PREFIX = 'feature';

const sanitizeStage = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureStartsWithLetter = (value: string): string =>
  /^[a-z]/.test(value) ? value : `s-${value}`;

const shorten = (value: string, maxLength: number): string => value.slice(0, Math.max(1, maxLength));

export const isPermanentStageName = (stageName: string): boolean =>
  PERMANENT_STAGE_NAMES.includes(stageName as (typeof PERMANENT_STAGE_NAMES)[number]);

export const resolveStageLifecycle = (stageName: string): StageLifecycle =>
  isPermanentStageName(stageName) ? 'permanent' : 'ephemeral';

type ResolveStageNameOptions = {
  fallbackStage?: string;
  lifecycle?: StageLifecycle;
  maxLength?: number;
  ephemeralPrefix?: string;
};

export const resolveStageName = (
  rawStageName: string | undefined,
  options: ResolveStageNameOptions = {},
): string => {
  const fallbackStage = options.fallbackStage ?? DEFAULT_FALLBACK_STAGE;
  const lifecycle = options.lifecycle ?? 'permanent';
  const maxLength = options.maxLength ?? DEFAULT_MAX_STAGE_LENGTH;
  const ephemeralPrefix = options.ephemeralPrefix ?? DEFAULT_EPHEMERAL_PREFIX;

  const sanitizedFallbackStage = sanitizeStage(fallbackStage) || DEFAULT_FALLBACK_STAGE;
  const baseStage = sanitizeStage(rawStageName ?? '') || sanitizedFallbackStage;

  const needsEphemeralPrefix = lifecycle === 'ephemeral' && isPermanentStageName(baseStage);
  const prefixedStage = needsEphemeralPrefix ? `${sanitizeStage(ephemeralPrefix)}-${baseStage}` : baseStage;

  return ensureStartsWithLetter(shorten(prefixedStage, maxLength));
};
