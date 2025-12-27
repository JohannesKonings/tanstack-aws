import { useLiveQuery } from '@tanstack/react-db';
// oxlint-disable func-style
import { todosCollection } from '#src/webapp/db-collections/todos';
import type { Todo } from '../types/todo';

export function useTodo() {
  const addTodo = async ({ name, status }: Omit<Todo, 'id'>) => {
    // oxlint-disable-next-line no-magic-numbers
    const randomId = Math.floor(Math.random() * 1000000);
    todosCollection.insert({ id: randomId, name, status });
  };

  const toggleTodoStatus = (id: number, status: 'pending' | 'completed') => {
    todosCollection.update(id, (draft) => {
      if (draft) {
        draft.status = status;
      }
    });
  };

  const deleteTodo = (id: number) => {
    todosCollection.delete(id);
  };

  return { addTodo, toggleTodoStatus, deleteTodo };
}

export function useTodos() {
  const { data: todos } = useLiveQuery((todoQuery) =>
    todoQuery.from({ todo: todosCollection }).select(({ todo }) => ({
      ...todo,
    })),
  );

  return todos as Todo[];
}
