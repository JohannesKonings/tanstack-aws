import { type ChildProcess, spawn } from 'node:child_process';
import { join } from 'node:path';
import { isServerRunning } from '@aws-blocks/blocks/utils';
import type { Plugin } from 'vite-plus';
import {
  BLOCKS_SIDECAR_ENV,
  BLOCKS_SIDECAR_PORT,
  BLOCKS_SIDECAR_URL,
} from '#src/webapp/integrations/blocks-client/blocksSidecar';

const SIDECAR_START_TIMEOUT_MS = 30_000;
const SIDECAR_POLL_INTERVAL_MS = 500;
const SIDECAR_STOP_TIMEOUT_MS = 3_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForSidecar = async (deadline = Date.now() + SIDECAR_START_TIMEOUT_MS): Promise<void> => {
  if (await isServerRunning(BLOCKS_SIDECAR_PORT)) {
    return;
  }

  if (Date.now() >= deadline) {
    throw new Error(`Blocks sidecar did not start on port ${BLOCKS_SIDECAR_PORT}`);
  }

  await sleep(SIDECAR_POLL_INTERVAL_MS);
  return waitForSidecar(deadline);
};

const terminateSidecar = async (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  await new Promise<void>((resolve) => {
    const forceKillTimer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, SIDECAR_STOP_TIMEOUT_MS);

    child.once('exit', () => {
      clearTimeout(forceKillTimer);
      resolve();
    });
  });
};

export const blocksSidecarPlugin = (): Plugin => {
  let sidecarProcess: ChildProcess | null = null;

  const stopSidecar = async (): Promise<void> => {
    const child = sidecarProcess;
    sidecarProcess = null;

    if (!child) {
      return;
    }

    await terminateSidecar(child);
  };

  const startSidecar = async (): Promise<void> => {
    process.env[BLOCKS_SIDECAR_ENV] = BLOCKS_SIDECAR_URL;

    if (await isServerRunning(BLOCKS_SIDECAR_PORT)) {
      return;
    }

    const serverScript = join(process.cwd(), 'aws-blocks/scripts/server.ts');
    const child = spawn('vp', ['exec', 'tsx', serverScript], {
      cwd: process.cwd(),
      env: { ...process.env, BLOCKS_DEV_QUIET: '1' },
      stdio: 'inherit',
    });

    sidecarProcess = child;

    child.on('exit', (code, signal) => {
      if (child !== sidecarProcess) {
        return;
      }

      sidecarProcess = null;

      if (code !== 0 && code !== null) {
        console.error(
          `Blocks sidecar exited with code ${code ?? 'null'} (signal: ${signal ?? 'null'})`,
        );
      }
    });

    await waitForSidecar();
  };

  return {
    name: 'blocks-sidecar',
    apply: 'serve',
    async configureServer(server) {
      try {
        await startSidecar();
      } catch (error: unknown) {
        console.error('Failed to start Blocks sidecar:', error);
        process.exit(1);
      }

      server.httpServer?.once('close', () => {
        void stopSidecar();
      });

      return () => {
        void stopSidecar();
      };
    },
  };
};
