import fs from 'node:fs';
// oxlint-disable no-magic-numbers
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useCallback, useState } from 'react';
import { DemoListItem, DemoPageShell } from '#apps/webapp/components/DemoPageShell';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Input } from '#apps/webapp/components/ui/input';

/*
const loggingMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    console.log("Request:", request.url);
    return next();
  }
);
const loggedServerFunction = createServerFn({ method: "GET" }).middleware([
  loggingMiddleware,
]);
*/

const TODOS_FILE = '/tmp/todos.json';

// oxlint-disable-next-line func-style
async function readTodos() {
  return JSON.parse(
    await fs.promises.readFile(TODOS_FILE, 'utf-8').catch(() =>
      JSON.stringify(
        [
          { id: 1, name: 'Get groceries' },
          { id: 2, name: 'Buy a new phone' },
        ],
        null,
        2,
      ),
    ),
  );
}

const getTodos = createServerFn({
  method: 'GET',
}).handler(async () => await readTodos());

const addTodo = createServerFn({ method: 'POST' })
  .validator((data: string) => data)
  .handler(async ({ data }) => {
    const todos = await readTodos();
    todos.push({ id: todos.length + 1, name: data });
    await fs.promises.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2));
    return todos;
  });

export const Route = createFileRoute('/demo/start/server-funcs')({
  component: Home,
  loader: async () => await getTodos(),
});

// oxlint-disable-next-line func-style
function Home() {
  const router = useRouter();
  const todos = Route.useLoaderData();

  const [todo, setTodo] = useState('');

  const submitTodo = useCallback(async () => {
    await addTodo({ data: todo });
    setTodo('');
    router.invalidate();
  }, [todo, router]);

  return (
    <DemoPageShell
      title="Start Server Functions - Todo Example"
      badge={<Badge variant="teal">TanStack Start</Badge>}
      backgroundStyle={{
        backgroundImage:
          'radial-gradient(50% 50% at 20% 60%, #23272a 0%, #18181b 50%, #000000 100%)',
      }}
    >
      <ul className="mb-4 space-y-2">
        {todos?.map((t: { id: number; name: string }) => (
          <DemoListItem key={t.id}>
            <span className="text-lg">{t.name}</span>
          </DemoListItem>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          value={todo}
          onChange={(e) => setTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              submitTodo();
            }
          }}
          placeholder="Enter a new todo..."
        />
        <Button disabled={todo.trim().length === 0} onClick={submitTodo} color="cyan">
          Add todo
        </Button>
      </div>
    </DemoPageShell>
  );
}
