import { describe, expect, it } from 'vite-plus/test';
import { withAuroraResumeRetry } from './aurora-resume.ts';

const immediateSleep = (): Promise<void> => Promise.resolve();

const pauseError = (message = 'Database resuming after being auto-paused'): Error =>
  new Error(message);

describe('Aurora resume retry', () => {
  it('returns the operation result without waiting when Aurora is available', async () => {
    const sleeps: number[] = [];

    const result = await withAuroraResumeRetry(async () => 'ready', {
      onRetry: () => {},
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(result).toBe('ready');
    expect(sleeps).toEqual([]);
  });

  it('retries while Aurora resumes from auto-pause, then returns the operation result', async () => {
    const sleeps: number[] = [];
    let calls = 0;

    const result = await withAuroraResumeRetry(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw pauseError();
        }
        return 'ready';
      },
      {
        onRetry: () => {},
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      },
    );

    expect(result).toBe('ready');
    expect(calls).toBe(3);
    expect(sleeps).toEqual([30_000, 30_000]);
  });

  it('retries when the pause error is nested on the cause', async () => {
    let calls = 0;

    const result = await withAuroraResumeRetry(
      async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error('ExecuteStatement failed', {
            cause: pauseError(),
          });
        }
        return 'ready';
      },
      { onRetry: () => {}, sleep: immediateSleep },
    );

    expect(result).toBe('ready');
    expect(calls).toBe(2);
  });

  it('throws the pause error after four retries', async () => {
    const error = pauseError();
    let calls = 0;

    await expect(
      withAuroraResumeRetry(
        async () => {
          calls += 1;
          throw error;
        },
        { onRetry: () => {}, sleep: immediateSleep },
      ),
    ).rejects.toBe(error);
    expect(calls).toBe(5);
  });

  it('does not retry any other failure', async () => {
    const error = new Error('access denied');
    let calls = 0;

    await expect(
      withAuroraResumeRetry(
        async () => {
          calls += 1;
          throw error;
        },
        { onRetry: () => {}, sleep: immediateSleep },
      ),
    ).rejects.toBe(error);
    expect(calls).toBe(1);
  });
});
