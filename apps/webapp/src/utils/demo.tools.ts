import { toolDefinition } from '@tanstack/ai';
import guitars from '../data/example-guitars';

// Use plain JSON Schema for all tool schemas to avoid Zod 4 _zod access during
// Standard Schema conversion or validation (Zod can trigger undefined._zod).
const getGuitarsInputSchema = { type: 'object' as const, properties: {}, required: [] as string[] };
const getGuitarsOutputSchema = {
  type: 'array' as const,
  items: { type: 'object' as const, additionalProperties: true },
};

const recommendGuitarInputSchema = {
  type: 'object' as const,
  properties: {
    id: {
      oneOf: [
        { type: 'string' as const, description: 'The id of the guitar to recommend' },
        { type: 'number' as const, description: 'The id of the guitar to recommend' },
      ],
    },
  },
  required: ['id'] as string[],
};
const recommendGuitarOutputSchema = {
  type: 'object' as const,
  properties: { id: { type: 'string' as const } },
  required: ['id'] as string[],
};

interface RecommendGuitarInput {
  id: string | number;
}

function isRecommendGuitarInput(args: unknown): args is RecommendGuitarInput {
  if (typeof args !== 'object' || args === null || !('id' in args)) return false;
  const id = (args as RecommendGuitarInput).id;
  return typeof id === 'string' || typeof id === 'number';
}

const getGuitarsDef = toolDefinition({
  name: 'getGuitars',
  description: 'Get all products from the database',
  inputSchema: getGuitarsInputSchema,
  outputSchema: getGuitarsOutputSchema,
});

const recommendGuitarDef = toolDefinition({
  name: 'recommendGuitar',
  description: 'Use this tool to recommend a guitar to the user',
  inputSchema: recommendGuitarInputSchema,
  outputSchema: recommendGuitarOutputSchema,
});

export const getGuitars = getGuitarsDef.server(async () => {
  return Promise.resolve(guitars);
});

export const recommendGuitar = recommendGuitarDef.server(async (args: unknown) => {
  if (!isRecommendGuitarInput(args)) {
    throw new Error('Invalid args: expected { id: string | number }');
  }
  return { id: String(args.id) };
});

export default async function getTools() {
  return [getGuitars, recommendGuitar];
}
