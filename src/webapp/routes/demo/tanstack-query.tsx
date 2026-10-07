import { TrashIcon } from '@phosphor-icons/react';
// oxlint-disable func-style
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { DemoListItem, DemoPageShell } from '#src/webapp/components/DemoPageShell';
import { Badge } from '#src/webapp/components/ui/badge';
import { Button } from '#src/webapp/components/ui/button';
import { Input } from '#src/webapp/components/ui/input';
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
    <DemoPageShell
      title="TanStack Query Todos list"
      badge={<Badge variant="info">TanStack Query</Badge>}
      backgroundStyle={{
        backgroundImage:
          'radial-gradient(50% 50% at 80% 20%, #3B021F 0%, #7B1028 60%, #1A000A 100%)',
      }}
    >
      <ul className="mb-4 space-y-2">
        {data?.map((todoItem) => {
          const isCompleted = todoItem.status === 'completed';
          let textClasses = '';
          if (isCompleted) {
            textClasses = 'line-through opacity-60';
          }
          return (
            <DemoListItem key={todoItem.id}>
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={() => handleTodoStatusToggle(todoItem)}
                className="size-5 cursor-pointer accent-lib-start"
              />
              <span className={`flex-1 text-lg ${textClasses}`}>{todoItem.name}</span>
              <Button
                type="button"
                variant="icon"
                color="red"
                size="icon-sm"
                onClick={() => deleteTodo(todoItem.id)}
                aria-label={`Delete todo ${todoItem.name}`}
              >
                <TrashIcon className="size-5" aria-hidden="true" />
              </Button>
            </DemoListItem>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          value={todo}
          onChange={(event) => setTodo(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              submitTodo();
            }
          }}
          placeholder="Enter a new todo..."
        />
        <Button
          // oxlint-disable-next-line no-magic-numbers
          disabled={todo.trim().length === 0}
          onClick={submitTodo}
          color="cyan"
        >
          Add todo
        </Button>
      </div>
    </DemoPageShell>
  );
}
