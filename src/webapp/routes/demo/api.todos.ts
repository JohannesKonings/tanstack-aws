import { createFileRoute } from '@tanstack/react-router';
import { todosRestHandlers } from '#src/webapp/integrations/blocks-client/todosRestHandlers';

export const Route = createFileRoute('/demo/api/todos')({
  server: {
    handlers: todosRestHandlers,
  },
});
