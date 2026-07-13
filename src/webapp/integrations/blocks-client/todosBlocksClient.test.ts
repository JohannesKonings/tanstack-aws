import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import {
  BLOCKS_SIDECAR_ENV,
  BLOCKS_SIDECAR_URL,
} from '#src/webapp/integrations/blocks-client/blocksSidecar';

const mockApi = {
  listTodos: vi.fn(async () => [{ id: 1, name: 'Sidecar todo', status: 'pending' as const }]),
  createTodo: vi.fn(),
  updateTodos: vi.fn(),
  deleteTodos: vi.fn(),
};

vi.mock('@aws-blocks/blocks/client', () => ({
  ApiNamespaceClient: vi.fn(() => mockApi),
}));

describe('todosBlocksClient sidecar mode', () => {
  beforeEach(() => {
    vi.resetModules();
    mockApi.listTodos.mockClear();
    process.env[BLOCKS_SIDECAR_ENV] = BLOCKS_SIDECAR_URL;
  });

  afterEach(() => {
    delete process.env[BLOCKS_SIDECAR_ENV];
  });

  test('uses the Blocks HTTP client when BLOCKS_SIDECAR_URL is set', async () => {
    const { ApiNamespaceClient } = await import('@aws-blocks/blocks/client');
    const { createTodosBlocksClient } =
      await import('#src/webapp/integrations/blocks-client/todosBlocksClient');

    const client = createTodosBlocksClient();
    const todos = await client.getTodos();

    expect(ApiNamespaceClient).toHaveBeenCalledWith('api', { url: BLOCKS_SIDECAR_URL });
    expect(todos).toEqual([{ id: 1, name: 'Sidecar todo', status: 'pending' }]);
    expect(mockApi.listTodos).toHaveBeenCalledOnce();
  });
});
