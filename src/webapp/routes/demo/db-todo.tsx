import { TrashIcon } from '@phosphor-icons/react';
// oxlint-disable func-style
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { DemoListItem, DemoPageShell } from '#src/webapp/components/DemoPageShell';
import { Badge } from '#src/webapp/components/ui/badge';
import { Button } from '#src/webapp/components/ui/button';
import { Input } from '#src/webapp/components/ui/input';
import { useTodo, useTodos } from '#src/webapp/hooks/useDbTodos';

export const Route = createFileRoute('/demo/db-todo')({
  ssr: false,
  component: DbTodos,
});

function DbTodos() {
  const todos = useTodos();
  const { addTodo, toggleTodoStatus, deleteTodo } = useTodo();

  const [todo, setTodo] = useState<string>('');

  const submitTodo = () => {
    if (todo.trim() !== '') {
      addTodo({ name: todo, status: 'pending' });
      setTodo('');
    }
  };

  const handleTodoStatusToggle = (todoItem: (typeof todos)[number]) => {
    if (todoItem.status === 'completed') {
      toggleTodoStatus(todoItem.id, 'pending');
    } else {
      toggleTodoStatus(todoItem.id, 'completed');
    }
  };

  return (
    <DemoPageShell
      title="DB Todo list"
      badge={<Badge variant="teal">TanStack DB</Badge>}
      backgroundStyle={{
        backgroundImage:
          'radial-gradient(50% 50% at 95% 5%, #4a90c2 0%, #317eb9 50%, #1e4d72 100%)',
      }}
    >
      <ul className="mb-4 space-y-2">
        {todos?.map((todoItem) => {
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
