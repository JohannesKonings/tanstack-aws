import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { createCollection } from '@tanstack/react-db';
import { getContext } from '@/webapp/integrations/tanstack-query/root-provider';
import { type Todo, todoSchema } from '../types/todo';

// const todoApiPath = '/demo/api/tq-todos';
const todoApiPath = '/demo/api/ddb-todos';
const api = {
  async fetchTodos(): Promise<Todo[]> {
    const response = await fetch(todoApiPath);
    if (!response.ok) {
      throw new Error('Failed to fetch todos');
    }
    const data = await response.json();
    return todoSchema.array().parse(data);
  },

  async createTodo(todo: Omit<Todo, 'id'>) {
    await fetch(todoApiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(todo),
    });
  },

  async updateTodos(updates: { id: number; changes: Partial<Omit<Todo, 'id'>> }[]) {
    await fetch(todoApiPath, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
  },

  async deleteTodos(ids: number[]) {
    await fetch(todoApiPath, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ids),
    });
  },
};

export const todosCollection = createCollection(
  queryCollectionOptions<Todo>({
    queryKey: ['todos'],
    queryFn: () => api.fetchTodos(),
    queryClient: getContext().queryClient,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const newItems = transaction.mutations.map((mutation) => ({
        id: Math.random(), // Temporary ID; real ID should be assigned by the server
        name: mutation.modified.name,
        status: mutation.modified.status,
      }));
      for (const item of newItems) {
        api.createTodo(item);
      }
    },
    onUpdate: async ({ transaction }) => {
      const updates = transaction.mutations.map((mutation) => ({
        id: mutation.key,
        changes: mutation.changes,
      }));
      await api.updateTodos(updates);
    },
    onDelete: async ({ transaction }) => {
      const ids = transaction.mutations.map((mutation) => mutation.key);
      await api.deleteTodos(ids);
    },
  }),
);
