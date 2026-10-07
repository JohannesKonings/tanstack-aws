// oxlint-disable func-style
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { DemoListItem, DemoPageShell } from '#apps/webapp/components/DemoPageShell';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Input } from '#apps/webapp/components/ui/input';
import { useTRPC } from '#apps/webapp/integrations/trpc/react';

export const Route = createFileRoute('/demo/trpc-todo')({
  component: TRPCTodos,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(context.trpc.todos.list.queryOptions());
  },
});

function TRPCTodos() {
  const trpc = useTRPC();
  const { data, refetch } = useQuery(trpc.todos.list.queryOptions());

  const [todo, setTodo] = useState('');
  const { mutate: addTodo } = useMutation({
    ...trpc.todos.add.mutationOptions(),
    onSuccess: () => {
      refetch();
      setTodo('');
    },
  });

  const submitTodo = useCallback(() => {
    addTodo({ name: todo });
  }, [addTodo, todo]);

  return (
    <DemoPageShell
      title="tRPC Todos list"
      badge={<Badge variant="purple">tRPC</Badge>}
      backgroundStyle={{
        backgroundImage:
          'radial-gradient(50% 50% at 95% 5%, #4a90c2 0%, #317eb9 50%, #1e4d72 100%)',
      }}
    >
      <ul className="mb-4 space-y-2">
        {data?.map((todoItem) => (
          <DemoListItem key={todoItem.id}>
            <span className="text-lg">{todoItem.name}</span>
          </DemoListItem>
        ))}
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
