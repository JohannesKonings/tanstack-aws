import { type ChildProcess, spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { isServerRunning } from '@aws-blocks/blocks/utils';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import {
  BLOCKS_SIDECAR_ENV,
  BLOCKS_SIDECAR_PORT,
  BLOCKS_SIDECAR_RPC_PATH,
  BLOCKS_SIDECAR_URL,
} from '#src/webapp/integrations/blocks-client/blocksSidecar';
import { resetTodosBlocksClientForTests } from '#src/webapp/integrations/blocks-client/todosBlocksClient';
import {
  getContext,
  Provider,
  resetQueryContextForTests,
} from '#src/webapp/integrations/tanstack-query/root-provider';

const BB_DATA_DIR = join(process.cwd(), '.bb-data');
const SIDECAR_START_TIMEOUT_MS = 30_000;
const SIDECAR_POLL_INTERVAL_MS = 500;
const nodeFetch = globalThis.fetch.bind(globalThis);

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
    }, 3_000);

    child.once('exit', () => {
      clearTimeout(forceKillTimer);
      resolve();
    });
  });
};

const resetBlocksData = () => {
  rmSync(BB_DATA_DIR, { force: true, recursive: true });
  mkdirSync(BB_DATA_DIR, { recursive: true });
};

const stopSidecarOnPort = async (): Promise<void> => {
  if (!(await isServerRunning(BLOCKS_SIDECAR_PORT))) {
    return;
  }

  try {
    const { execSync } = await import('node:child_process');
    const pids = execSync(`lsof -ti:${BLOCKS_SIDECAR_PORT}`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const pid of pids) {
      execSync(`kill ${pid}`);
    }
    await sleep(500);
  } catch {
    // Port already free.
  }
};

const startSidecar = async (): Promise<ChildProcess> => {
  resetBlocksData();
  const serverScript = join(process.cwd(), 'aws-blocks/scripts/server.ts');
  const child = spawn('vp', ['exec', 'tsx', serverScript], {
    cwd: process.cwd(),
    env: { ...process.env, BLOCKS_DEV_QUIET: '1' },
    stdio: 'pipe',
  });
  await waitForSidecar();
  return child;
};

const installTodoApiFetch = async () => {
  const { todosRestHandlers } =
    await import('#src/webapp/integrations/blocks-client/todosRestHandlers');

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const { pathname } = new URL(url, 'http://localhost');

    if (pathname === '/demo/api/todos') {
      const method = init?.method ?? 'GET';
      const request = new Request('http://localhost/demo/api/todos', init);

      switch (method) {
        case 'GET':
          return todosRestHandlers.GET();
        case 'POST':
          return todosRestHandlers.POST({ request });
        case 'PUT':
          return todosRestHandlers.PUT({ request });
        case 'DELETE':
          return todosRestHandlers.DELETE({ request });
        default:
          throw new Error(`Unsupported method in smoke test: ${method}`);
      }
    }

    if (pathname === BLOCKS_SIDECAR_RPC_PATH) {
      return nodeFetch(input, init);
    }

    throw new Error(`Unexpected fetch URL in smoke test: ${url}`);
  });
};

const installDom = () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000',
  });
  const { window } = dom;

  vi.stubGlobal('window', window);
  vi.stubGlobal('document', window.document);
  vi.stubGlobal('HTMLElement', window.HTMLElement);
  vi.stubGlobal('Node', window.Node);
  vi.stubGlobal('Event', window.Event);
  vi.stubGlobal('getComputedStyle', window.getComputedStyle.bind(window));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 0),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    clearTimeout(id);
  });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
};

describe('db-todo full-stack smoke', () => {
  let sidecarProcess: ChildProcess | null = null;
  let reactRoot: Root | null = null;
  let spawnedSidecar = false;

  beforeAll(async () => {
    installDom();
    process.env[BLOCKS_SIDECAR_ENV] = BLOCKS_SIDECAR_URL;
    await stopSidecarOnPort();
    sidecarProcess = await startSidecar();
    spawnedSidecar = true;
  });

  beforeEach(async () => {
    resetQueryContextForTests();
    resetTodosBlocksClientForTests();
    vi.resetModules();
    process.env[BLOCKS_SIDECAR_ENV] = BLOCKS_SIDECAR_URL;
    await installTodoApiFetch();
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterAll(async () => {
    await act(async () => {
      reactRoot?.unmount();
      reactRoot = null;
    });

    vi.unstubAllGlobals();

    if (spawnedSidecar && sidecarProcess) {
      await terminateSidecar(sidecarProcess);
    }

    resetBlocksData();
    delete process.env[BLOCKS_SIDECAR_ENV];
    resetQueryContextForTests();
  });

  test('db-todo route modules load without todoSchema initialization errors', async () => {
    await expect(import('./db-todo')).resolves.toBeDefined();
    await expect(import('#src/webapp/db-collections/todos')).resolves.toBeDefined();
    await expect(import('#src/webapp/types/todo-schema')).resolves.toBeDefined();
  });

  test('REST handlers persist todos through the Blocks sidecar', async () => {
    const { todosRestHandlers } =
      await import('#src/webapp/integrations/blocks-client/todosRestHandlers');

    const todoId = Date.now() % 100_000;

    const created = await todosRestHandlers.POST({
      request: new Request('http://localhost/demo/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: todoId, name: 'Sidecar smoke todo', status: 'pending' }),
      }),
    });

    expect(created.status).toBe(200);
    expect(await created.json()).toEqual({
      id: todoId,
      name: 'Sidecar smoke todo',
      status: 'pending',
    });

    const listed = await todosRestHandlers.GET();
    expect(await listed.json()).toEqual([
      { id: todoId, name: 'Sidecar smoke todo', status: 'pending' },
    ]);
  });

  test('frontend renders todos and mutates through the UI against the Blocks sidecar', async () => {
    const { Route } = await import('./db-todo');
    const { todosCollection } = await import('#src/webapp/db-collections/todos');
    const DbTodos = Route.options.component;
    if (!DbTodos) {
      throw new Error('db-todo route is missing a component');
    }

    const rqContext = getContext();
    const container = document.getElementById('root');
    if (!container) {
      throw new Error('Missing #root container');
    }

    reactRoot = createRoot(container);

    await act(async () => {
      reactRoot?.render(
        createElement(Provider, {
          queryClient: rqContext.queryClient,
          // oxlint-disable-next-line react/no-children-prop
          children: createElement(DbTodos),
        }),
      );
    });

    await vi.waitFor(() => {
      expect(document.querySelector('h1')?.textContent).toBe('DB Todo list');
    });

    await act(async () => {
      todosCollection.insert({
        id: 999_001,
        name: 'Smoke test todo',
        status: 'pending',
      });
    });

    await vi.waitFor(
      () => {
        expect(document.body.textContent).toContain('Smoke test todo');
      },
      { timeout: 5_000 },
    );

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await act(async () => {
      checkbox.click();
    });

    await vi.waitFor(() => {
      expect(checkbox.checked).toBe(true);
    });

    const deleteButton = document.querySelector(
      'button[aria-label^="Delete todo"]',
    ) as HTMLButtonElement;
    await act(async () => {
      deleteButton.click();
    });

    await vi.waitFor(
      () => {
        expect(document.body.textContent).not.toContain('Smoke test todo');
      },
      { timeout: 5_000 },
    );
  });
});
