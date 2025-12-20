// oxlint-disable func-style
import { createFileRoute } from '@tanstack/react-router';
import { createTodosDdbClient } from '@/webapp/integrations/ddb-client/ddbClient';
import {
  createTodoRequestSchema,
  deleteTodosRequestSchema,
  updateTodosRequestSchema,
} from '@/webapp/types/todo';

const todosClient = createTodosDdbClient();

export const Route = createFileRoute('/demo/api/ddb-todos')({
  server: {
    handlers: {
      // oxlint-disable-next-line arrow-body-style
      GET: async () => {
        const items = await todosClient.getTodos();
        return Response.json(items);
      },
      POST: async ({ request }) => {
        const requestJson = await request.json();
        const todoParsed = createTodoRequestSchema.parse(requestJson);

        const saved = await todosClient.putTodo(todoParsed);
        return Response.json(saved);
      },
      PUT: async ({ request }) => {
        const requestJson = await request.json();
        const updates = updateTodosRequestSchema.parse(requestJson);

        await todosClient.updateTodos(updates);

        return Response.json({ ok: true });
      },
      DELETE: async ({ request }) => {
        const requestJson = await request.json();
        const ids = deleteTodosRequestSchema.parse(requestJson);

        await todosClient.deleteTodos(ids);

        return Response.json({ ok: true });
      },
    },
  },
});
