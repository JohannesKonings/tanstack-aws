import { type ZodObject, type ZodRawShape, type ZodType } from 'zod';

/**
 * ElectroDB attribute type definition
 * Derived from Zod schemas to ensure single source of truth
 */
export type ElectroDBAttribute = {
  type: 'string' | 'number' | 'boolean' | 'list' | 'map' | 'set' | 'any' | readonly string[];
  required?: boolean;
  default?: unknown;
};

// Helper to get the schema's internal type discriminator (Zod 4 uses def.type)
const getZodTypeName = (schema: ZodType): string => {
  // Access the internal _zod.def.type which exists in Zod 4
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internals = (schema as any)._zod?.def?.type ?? (schema as any).def?.type ?? '';
  return internals;
};

// Helper to unwrap wrapper types and get inner schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrapSchema = (schema: ZodType): ZodType => (schema as any).unwrap?.() ?? schema;

// Helper to resolve default value
const resolveDefaultValue = (defaultValue: unknown): unknown => {
  if (typeof defaultValue === 'function') {
    return defaultValue();
  }
  return defaultValue;
};

/**
 * Convert a single Zod type to ElectroDB attribute definition
 */
const convertZodType = (zodType: ZodType): ElectroDBAttribute => {
  const typeName = getZodTypeName(zodType);

  // Handle optional wrapper
  if (typeName === 'optional') {
    const inner = convertZodType(unwrapSchema(zodType));
    return { ...inner, required: false };
  }

  // Handle nullable
  if (typeName === 'nullable') {
    const inner = convertZodType(unwrapSchema(zodType));
    return { ...inner, required: false };
  }

  // Handle default values
  if (typeName === 'default') {
    const inner = convertZodType(unwrapSchema(zodType));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultValue = (zodType as any)._zod?.def?.defaultValue;
    return { ...inner, default: resolveDefaultValue(defaultValue) };
  }

  // Handle primitives
  if (typeName === 'string') {
    return { type: 'string', required: true };
  }
  if (typeName === 'number' || typeName === 'int') {
    return { type: 'number', required: true };
  }
  if (typeName === 'boolean') {
    return { type: 'boolean', required: true };
  }

  // Handle enums - ElectroDB supports enum as array of strings
  if (typeName === 'enum') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = (zodType as any)._zod?.def?.entries ?? (zodType as any)._zod?.values ?? [];
    return { type: values as readonly string[], required: true };
  }

  // Handle arrays
  if (typeName === 'array' || typeName === 'tuple') {
    return { type: 'list', required: true };
  }

  // Handle objects (nested)
  if (typeName === 'object' || typeName === 'record') {
    return { type: 'map', required: true };
  }

  // Handle literals
  if (typeName === 'literal') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (zodType as any)._zod?.def?.value;
    if (typeof value === 'string') {
      return { type: [value] as readonly string[], required: true };
    }
    if (typeof value === 'number') {
      return { type: 'number', required: true };
    }
    if (typeof value === 'boolean') {
      return { type: 'boolean', required: true };
    }
    return { type: 'any', required: true };
  }

  // Handle union types
  if (typeName === 'union') {
    return { type: 'any', required: true };
  }

  // Handle intersection types
  if (typeName === 'intersection') {
    return { type: 'map', required: true };
  }

  // Handle pipe (transform)
  if (typeName === 'pipe' || typeName === 'transform') {
    const inner = unwrapSchema(zodType);
    return convertZodType(inner);
  }

  // Default to string for unknown types
  return { type: 'string', required: true };
};

/**
 * Convert a Zod schema to ElectroDB attributes
 * This ensures Zod is the single source of truth for schema definitions
 *
 * @example
 * ```typescript
 * const personAttributes = zodToElectroDBAttributes(PersonSchema.omit({ id: true }))
 * // Returns: { firstName: { type: 'string', required: true }, ... }
 * ```
 */
export const zodToElectroDBAttributes = <TShape extends ZodRawShape>(
  schema: ZodObject<TShape>,
): Record<keyof TShape, ElectroDBAttribute> => {
  const { shape } = schema;
  const attributes: Record<string, ElectroDBAttribute> = {};

  for (const [key, zodType] of Object.entries(shape)) {
    attributes[key] = convertZodType(zodType as ZodType);
  }

  return attributes as Record<keyof TShape, ElectroDBAttribute>;
};

/**
 * Helper to extract enum values from a Zod enum schema
 * Useful for ElectroDB enum validation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getEnumValues = (enumSchema: ZodType): readonly string[] =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (enumSchema as any)._zod?.def?.entries ?? (enumSchema as any)._zod?.values ?? [];
