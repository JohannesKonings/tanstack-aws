import { todoSchema } from '../../src/webapp/types/todo-schema.ts';
import { type BlocksTodoItem, TODOS_PK } from './types.ts';

export const todoSortKey = (id: number): string => `TODO#${id}`;

export const toBlocksTodoItem = (todo: {
  id: number;
  name: string;
  status: 'pending' | 'completed';
}): BlocksTodoItem => ({
  pk: TODOS_PK,
  sk: todoSortKey(todo.id),
  id: todo.id,
  name: todo.name,
  status: todo.status,
});

export const parseLegacyTodoItem = (item: Record<string, unknown>): BlocksTodoItem | null => {
  if (item.pk !== TODOS_PK) {
    return null;
  }

  const parsed = todoSchema.safeParse({
    id: item.id,
    name: item.name,
    status: item.status,
  });

  if (!parsed.success) {
    return null;
  }

  if (item.sk !== todoSortKey(parsed.data.id)) {
    return null;
  }

  return toBlocksTodoItem(parsed.data);
};
