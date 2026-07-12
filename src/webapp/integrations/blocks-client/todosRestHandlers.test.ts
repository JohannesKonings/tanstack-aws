import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { resetTodosBlocksClientForTests } from '#src/webapp/integrations/blocks-client/todosBlocksClient';

const BB_DATA_DIR = join(process.cwd(), '.bb-data');

const resetBlocksData = () => {
  rmSync(BB_DATA_DIR, { force: true, recursive: true });
  mkdirSync(BB_DATA_DIR, { recursive: true });
};

const jsonRequest = (method: string, body?: unknown) =>
  new Request('http://localhost/demo/api/todos', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('/demo/api/todos REST contract', () => {
  let todosRestHandlers: typeof import('#src/webapp/integrations/blocks-client/todosRestHandlers').todosRestHandlers;

  afterAll(() => {
    resetBlocksData();
  });

  beforeEach(async () => {
    resetBlocksData();
    resetTodosBlocksClientForTests();
    vi.resetModules();
    ({ todosRestHandlers } =
      await import('#src/webapp/integrations/blocks-client/todosRestHandlers'));
  });

  test('GET returns an empty todo list initially', async () => {
    const response = await todosRestHandlers.GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual([]);
  });

  test('POST creates a todo and returns the saved entity', async () => {
    const todo = { id: 42, name: 'Write tests', status: 'pending' as const };

    const response = await todosRestHandlers.POST({ request: jsonRequest('POST', todo) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(todo);
  });

  test('POST rejects invalid payloads with 400', async () => {
    const response = await todosRestHandlers.POST({
      request: jsonRequest('POST', { id: 'not-a-number', name: 'Bad', status: 'pending' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid todo payload' });
  });

  test('PUT updates todos and returns ok', async () => {
    await todosRestHandlers.POST({
      request: jsonRequest('POST', { id: 7, name: 'Before', status: 'pending' }),
    });

    const response = await todosRestHandlers.PUT({
      request: jsonRequest('PUT', [{ id: 7, changes: { status: 'completed' } }]),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const listResponse = await todosRestHandlers.GET();
    expect(await listResponse.json()).toEqual([{ id: 7, name: 'Before', status: 'completed' }]);
  });

  test('PUT rejects invalid payloads with 400', async () => {
    const response = await todosRestHandlers.PUT({
      request: jsonRequest('PUT', [{ id: 1, changes: { status: 'invalid-status' } }]),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid todo update payload' });
  });

  test('DELETE removes todos and returns ok', async () => {
    await todosRestHandlers.POST({
      request: jsonRequest('POST', { id: 9, name: 'Delete me', status: 'pending' }),
    });

    const response = await todosRestHandlers.DELETE({
      request: jsonRequest('DELETE', [9]),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const listResponse = await todosRestHandlers.GET();
    expect(await listResponse.json()).toEqual([]);
  });

  test('DELETE rejects invalid payloads with 400', async () => {
    const response = await todosRestHandlers.DELETE({
      request: jsonRequest('DELETE', ['not-an-id']),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid todo delete payload' });
  });

  test('supports create → list → update → delete sequence', async () => {
    const created = await todosRestHandlers.POST({
      request: jsonRequest('POST', { id: 100, name: 'Sequence', status: 'pending' }),
    });
    expect(await created.json()).toEqual({
      id: 100,
      name: 'Sequence',
      status: 'pending',
    });

    const listed = await todosRestHandlers.GET();
    expect(await listed.json()).toEqual([{ id: 100, name: 'Sequence', status: 'pending' }]);

    await todosRestHandlers.PUT({
      request: jsonRequest('PUT', [{ id: 100, changes: { name: 'Updated sequence' } }]),
    });

    const listedAfterUpdate = await todosRestHandlers.GET();
    expect(await listedAfterUpdate.json()).toEqual([
      { id: 100, name: 'Updated sequence', status: 'pending' },
    ]);

    await todosRestHandlers.DELETE({
      request: jsonRequest('DELETE', [100]),
    });

    const listedAfterDelete = await todosRestHandlers.GET();
    expect(await listedAfterDelete.json()).toEqual([]);
  });
});
