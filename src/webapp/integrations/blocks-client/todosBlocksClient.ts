import type {
  CreateTodoRequest,
  DeleteTodosRequest,
  Todo,
  TodoUpdate,
} from '#src/webapp/types/todo';

type BlocksApiMethods = {
  listTodos: () => Promise<Todo[]>;
  createTodo: (todo: CreateTodoRequest) => Promise<Todo>;
  updateTodos: (updates: TodoUpdate[]) => Promise<void>;
  deleteTodos: (ids: DeleteTodosRequest) => Promise<void>;
};

type BlocksApiHandler = (context: BlocksRequestContext) => BlocksApiMethods;

type BlocksRequestContext = {
  request: {
    headers: Headers;
    body: ReadableStream<Uint8Array> | null;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
    url: string;
    params: Record<string, string>;
    signal: AbortSignal;
  };
  response: {
    headers: Headers;
    status: number;
    send: (body: unknown) => void;
  };
};

const createBlocksRequestContext = (): BlocksRequestContext => {
  const responseHeaders = new Headers();
  let responseStatus = 200;

  return {
    request: {
      headers: new Headers(),
      body: null,
      json: async () => ({}),
      text: async () => '',
      url: 'http://localhost/',
      params: {},
      signal: AbortSignal.timeout(30_000),
    },
    response: {
      headers: responseHeaders,
      get status() {
        return responseStatus;
      },
      set status(code: number) {
        responseStatus = code;
      },
      send: () => {},
    },
  };
};

let blocksApiMethods: BlocksApiMethods | null = null;

export const resetTodosBlocksClientForTests = (): void => {
  blocksApiMethods = null;
};

const getBlocksApiMethods = async (): Promise<BlocksApiMethods> => {
  if (blocksApiMethods) {
    return blocksApiMethods;
  }

  const backend = await import('../../../../aws-blocks/index.ts');
  // ApiNamespace exports a handler factory; cast bridges Blocks' internal type.
  const apiHandler = backend.api as unknown as BlocksApiHandler;
  blocksApiMethods = apiHandler(createBlocksRequestContext());
  return blocksApiMethods;
};

export type TodosBlocksClient = {
  getTodos: () => Promise<Todo[]>;
  putTodo: (todo: CreateTodoRequest) => Promise<Todo>;
  updateTodos: (updates: TodoUpdate[]) => Promise<void>;
  deleteTodos: (ids: DeleteTodosRequest) => Promise<void>;
};

export const createTodosBlocksClient = (): TodosBlocksClient => ({
  getTodos: async () => {
    const api = await getBlocksApiMethods();
    return api.listTodos();
  },

  putTodo: async (todo) => {
    const api = await getBlocksApiMethods();
    return api.createTodo(todo);
  },

  updateTodos: async (updates) => {
    const api = await getBlocksApiMethods();
    await api.updateTodos(updates);
  },

  deleteTodos: async (ids) => {
    const api = await getBlocksApiMethods();
    await api.deleteTodos(ids);
  },
});
