import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { type Todo, todoSchema } from '#src/webapp/types/todo';

let todos: Todo[] = [
  {
    id: 1,
    name: 'Buy groceries',
    status: 'pending',
  },
  {
    id: 2,
    name: 'Buy mobile phone',
    status: 'pending',
  },
  {
    id: 3,
    name: 'Buy laptop',
    status: 'pending',
  },
];

export const Route = createFileRoute('/demo/api/tq-todos')({
  server: {
    handlers: {
      // oxlint-disable-next-line arrow-body-style
      GET: () => {
        return Response.json(todos);
      },
      POST: async ({ request }) => {
        const requestJson = await request.json();
        const todoParsed = todoSchema.parse(requestJson);
        const existingIndex = todos.findIndex((todoItem) => todoItem.id === todoParsed.id);
        // oxlint-disable-next-line no-magic-numbers
        if (existingIndex >= 0) {
          todos[existingIndex] = todoParsed;
        } else {
          todos = [...todos, todoParsed];
        }
        return Response.json(todoParsed);
      },
      PUT: async ({ request }) => {
        const requestJson = await request.json();
        const updatesSchema = z.array(
          z.object({
            id: z.number(),
            changes: z
              .object({
                name: z.string().optional(),
                status: z.enum(['pending', 'completed']).optional(),
              })
              .strict(),
          }),
        );

        const updates = updatesSchema.parse(requestJson);

        for (const update of updates) {
          const index = todos.findIndex((todoItem) => todoItem.id === update.id);
          // oxlint-disable-next-line no-magic-numbers
          if (index >= 0) {
            todos[index] = {
              ...todos[index],
              ...update.changes,
            };
          }
        }

        return Response.json({ ok: true });
      },
      DELETE: async ({ request }) => {
        const requestJson = await request.json();
        const ids = z.array(z.number()).parse(requestJson);

        const idSet = new Set(ids);
        todos = todos.filter((todoItem) => !idSet.has(todoItem.id));

        return Response.json({ ok: true });
      },
    },
  },
});
