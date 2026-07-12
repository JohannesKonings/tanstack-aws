import { createTodosBlocksClient } from '#src/webapp/integrations/blocks-client/todosBlocksClient';
import {
  createTodoRequestSchema,
  deleteTodosRequestSchema,
  updateTodosRequestSchema,
} from '#src/webapp/types/todo';

const todosClient = createTodosBlocksClient();

const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });

export const todosRestHandlers = {
  GET: async () => {
    const items = await todosClient.getTodos();
    return Response.json(items);
  },

  POST: async ({ request }: { request: Request }) => {
    const requestJson = await request.json();
    const parsed = createTodoRequestSchema.safeParse(requestJson);
    if (!parsed.success) {
      return badRequest('Invalid todo payload');
    }

    const saved = await todosClient.putTodo(parsed.data);
    return Response.json(saved);
  },

  PUT: async ({ request }: { request: Request }) => {
    const requestJson = await request.json();
    const parsed = updateTodosRequestSchema.safeParse(requestJson);
    if (!parsed.success) {
      return badRequest('Invalid todo update payload');
    }

    await todosClient.updateTodos(parsed.data);
    return Response.json({ ok: true });
  },

  DELETE: async ({ request }: { request: Request }) => {
    const requestJson = await request.json();
    const parsed = deleteTodosRequestSchema.safeParse(requestJson);
    if (!parsed.success) {
      return badRequest('Invalid todo delete payload');
    }

    await todosClient.deleteTodos(parsed.data);
    return Response.json({ ok: true });
  },
};
