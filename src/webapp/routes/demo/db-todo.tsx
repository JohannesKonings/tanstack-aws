// oxlint-disable func-style
import { createFileRoute } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTodo, useTodos } from '@/webapp/hooks/useDbTodos';

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
    <div
      className="flex items-center justify-center min-h-screen bg-linear-to-br from-purple-100 to-blue-100 p-4 text-white"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 95% 5%, #4a90c2 0%, #317eb9 50%, #1e4d72 100%)',
      }}
    >
      <div className="w-full max-w-2xl p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10">
        <h1 className="text-2xl mb-4">DB Todo list</h1>
        <ul className="mb-4 space-y-2">
          {todos?.map((todoItem) => {
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
