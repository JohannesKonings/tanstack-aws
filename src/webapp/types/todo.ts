import { z } from 'zod';
import { type Todo, todoSchema } from '#src/webapp/types/todo-schema';

export { todoSchema, type Todo };

export const createTodoRequestSchema = todoSchema;
export type CreateTodoRequest = z.infer<typeof createTodoRequestSchema>;

const todoUpdateSchema = z.object({
  id: z.number(),
  changes: z
    .object({
      name: z.string().optional(),
      status: z.enum(['pending', 'completed']).optional(),
    })
    .strict(),
});
export type TodoUpdate = z.infer<typeof todoUpdateSchema>;

export const updateTodosRequestSchema = z.array(todoUpdateSchema);
export type UpdateTodosRequest = z.infer<typeof updateTodosRequestSchema>;

export const deleteTodosRequestSchema = z.array(z.number());
export type DeleteTodosRequest = z.infer<typeof deleteTodosRequestSchema>;
