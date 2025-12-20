import { z } from 'zod';

export const todoSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(['pending', 'completed']),
});

export type Todo = z.infer<typeof todoSchema>;

export const createTodoRequestSchema = todoSchema;
export type CreateTodoRequest = z.infer<typeof createTodoRequestSchema>;

export const todoUpdateSchema = z.object({
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
