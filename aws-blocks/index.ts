import { ApiNamespace, DistributedTable, Scope } from '@aws-blocks/blocks';
import { z } from 'zod';

const TODOS_PK = 'TODO' as const;

const todoSortKey = (id: number): string => `TODO#${id}`;

const todoStatusEnum = z.enum(['pending', 'completed']);

const blocksTodoSchema = z.object({
  pk: z.literal(TODOS_PK),
  sk: z.string(),
  id: z.number(),
  name: z.string(),
  status: todoStatusEnum,
});

type BlocksTodo = z.infer<typeof blocksTodoSchema>;

const todoInputSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: todoStatusEnum,
});

const todoUpdateSchema = z.object({
  id: z.number(),
  changes: z
    .object({
      name: z.string().optional(),
      status: todoStatusEnum.optional(),
    })
    .strict(),
});

const scope = new Scope('tanstack-aws-todos');

const todosTable = new DistributedTable(scope, 'todos', {
  schema: blocksTodoSchema,
  key: { partitionKey: 'pk', sortKey: 'sk' },
});

const toPublicTodo = (item: BlocksTodo) => ({
  id: item.id,
  name: item.name,
  status: item.status,
});

export const api = new ApiNamespace(scope, 'api', () => ({
  async listTodos() {
    const items: BlocksTodo[] = [];
    for await (const item of todosTable.query({
      where: { pk: { equals: TODOS_PK } },
    })) {
      items.push(item);
    }
    return items.map(toPublicTodo);
  },

  async createTodo(todo: z.infer<typeof todoInputSchema>) {
    const parsed = todoInputSchema.parse(todo);
    const item: BlocksTodo = {
      pk: TODOS_PK,
      sk: todoSortKey(parsed.id),
      id: parsed.id,
      name: parsed.name,
      status: parsed.status,
    };
    await todosTable.put(item);
    return toPublicTodo(item);
  },

  async updateTodos(updates: z.infer<typeof todoUpdateSchema>[]) {
    const parsedUpdates = z.array(todoUpdateSchema).parse(updates);

    await Promise.all(
      parsedUpdates.map(async (update) => {
        const key = { pk: TODOS_PK, sk: todoSortKey(update.id) };
        const existing = await todosTable.get(key);
        if (!existing) {
          return;
        }

        const updated: BlocksTodo = {
          ...existing,
          ...update.changes,
        };
        await todosTable.put(updated);
      }),
    );
  },

  async deleteTodos(ids: number[]) {
    const parsedIds = z.array(z.number()).parse(ids);
    await todosTable.deleteBatch(parsedIds.map((id) => ({ pk: TODOS_PK, sk: todoSortKey(id) })));
  },
}));
