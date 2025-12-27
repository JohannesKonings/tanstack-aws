// oxlint-disable func-style
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { type Todo, todoSchema } from '#src/webapp/types/todo';

export const Route = createFileRoute('/demo/tanstack-query')({
  component: TanStackQueryDemo,
});

const todoApiPath = '/demo/api/tq-todos';

function TanStackQueryDemo() {
  const { data, refetch } = useQuery<Todo[]>({
    initialData: [],
    queryFn: async () => {
      const response = await fetch(todoApiPath);
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      const json = await response.json();
      return todoSchema.array().parse(json);
    },
    queryKey: ['todos'],
  });

  const { mutate: addTodo } = useMutation({
    mutationFn: (todo: Omit<Todo, 'id'>) =>
      fetch(todoApiPath, {
        body: JSON.stringify({
          // oxlint-disable-next-line no-magic-numbers
          id: Math.floor(Math.random() * 1000000),
          ...todo,
        } satisfies Todo),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((res) => res.json()),
    onSuccess: () => refetch(),
  });

  const { mutate: updateTodoStatus } = useMutation({
    mutationFn: (update: { id: number; status: Todo['status'] }) =>
      fetch(todoApiPath, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            id: update.id,
            changes: {
              status: update.status,
            },
          },
        ]),
      }),
    onSuccess: () => refetch(),
  });

  const { mutate: deleteTodo } = useMutation({
    mutationFn: (id: number) =>
      fetch(todoApiPath, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([id]),
      }),
    onSuccess: () => refetch(),
  });

  const [todo, setTodo] = useState('');

  const submitTodo = useCallback(async () => {
    if (todo.trim() === '') {
      return;
    }
    await addTodo({ name: todo, status: 'pending' });
    setTodo('');
  }, [addTodo, todo]);

  const handleTodoStatusToggle = useCallback(
    (todoItem: Todo) => {
      if (todoItem.status === 'completed') {
        updateTodoStatus({ id: todoItem.id, status: 'pending' });
      } else {
        updateTodoStatus({ id: todoItem.id, status: 'completed' });
      }
    },
    [updateTodoStatus],
  );

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-linear-to-br from-red-900 via-red-800 to-black p-4 text-white"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 80% 20%, #3B021F 0%, #7B1028 60%, #1A000A 100%)',
      }}
    >
      <div className="w-full max-w-2xl p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10">
        <h1 className="text-2xl mb-4">TanStack Query Todos list</h1>
        <ul className="mb-4 space-y-2">
          {data?.map((todoItem) => {
            const isCompleted = todoItem.status === 'completed';
            let textClasses = '';
            if (isCompleted) {
              textClasses = 'line-through opacity-60';
            }
            return (
              <li
                key={todoItem.id}
                className="bg-white/10 border border-white/20 rounded-lg p-3 backdrop-blur-sm shadow-md flex items-center gap-3"
              >
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={() => handleTodoStatusToggle(todoItem)}
                  className="w-5 h-5 cursor-pointer accent-blue-400"
                />
                <span className={`text-lg text-white flex-1 ${textClasses}`}>{todoItem.name}</span>
                <button
                  type="button"
                  onClick={() => deleteTodo(todoItem.id)}
                  className="text-white/80 hover:text-red-300 p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label={`Delete todo ${todoItem.name}`}
                >
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={todo}
            onChange={(event) => setTodo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                submitTodo();
              }
            }}
            placeholder="Enter a new todo..."
            className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          <button
            // oxlint-disable-next-line no-magic-numbers
            disabled={todo.trim().length === 0}
            onClick={submitTodo}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Add todo
          </button>
        </div>
      </div>
    </div>
  );
}
