const AURORA_RESUME_RETRY_ATTEMPTS = 4;
const AURORA_RESUME_RETRY_DELAY_MS = 30_000;
const AURORA_RESUMING_ERROR = 'resuming after being auto-paused';

export type AuroraResumeRetryOptions = {
  attempts?: number;
  delayMs?: number;
  onRetry?: (retry: { attempt: number; attempts: number; delayMs: number }) => void;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const errorText = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = error.cause === undefined ? '' : errorText(error.cause);
  return `${error.message}\n${cause}`;
};

const isAuroraResumingError = (error: unknown): boolean =>
  errorText(error).includes(AURORA_RESUMING_ERROR);

const logRetry = (retry: { attempt: number; attempts: number; delayMs: number }): void => {
  // oxlint-disable-next-line no-console -- resume retries are swallowed until the last failure
  console.log(
    `Aurora is resuming after auto-pause; retry ${retry.attempt} of ${retry.attempts} in ${retry.delayMs}ms`,
  );
};

/** Re-runs a Data API call while Aurora Serverless resumes from auto-pause. */
export const withAuroraResumeRetry = async <T>(
  operation: () => Promise<T>,
  options: AuroraResumeRetryOptions = {},
): Promise<T> => {
  const attempts = options.attempts ?? AURORA_RESUME_RETRY_ATTEMPTS;
  const delayMs = options.delayMs ?? AURORA_RESUME_RETRY_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;
  const onRetry = options.onRetry ?? logRetry;

  for (let attempt = 0; ; attempt++) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- sequential retries with backoff
      return await operation();
    } catch (error) {
      if (!isAuroraResumingError(error) || attempt >= attempts) {
        throw error;
      }
      const retry = { attempt: attempt + 1, attempts, delayMs };
      onRetry(retry);
      // oxlint-disable-next-line no-await-in-loop -- wait for Aurora to finish resuming
      await sleep(delayMs);
    }
  }
};
