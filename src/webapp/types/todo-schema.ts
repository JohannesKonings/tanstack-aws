import { z } from 'zod';

export const todoSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(['pending', 'completed']),
});

export type Todo = z.infer<typeof todoSchema>;
