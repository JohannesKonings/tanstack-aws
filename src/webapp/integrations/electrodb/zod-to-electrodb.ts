import { type ZodObject, type ZodRawShape, type ZodType } from 'zod';

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
 * Attribute result type - using 'any' to match ElectroDB's flexible attribute types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElectroDBAttributeResult = Record<string, any>;

// Handle wrapper types (optional, nullable, default)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleWrapperType = (typeName: string, zodType: ZodType): any | null => {
  if (typeName === 'optional' || typeName === 'nullable') {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return { ...convertZodType(unwrapSchema(zodType)), required: false };
  }
  if (typeName === 'default') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-use-before-define
    const inner = convertZodType(unwrapSchema(zodType));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultValue = (zodType as any)._zod?.def?.defaultValue;
    return { ...inner, default: resolveDefaultValue(defaultValue) };
  }
  return null;
};

// Handle primitive types (string, number, boolean)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlePrimitiveType = (typeName: string): any | null => {
  if (typeName === 'string') {
    return { type: 'string', required: true };
  }
  if (typeName === 'number' || typeName === 'int') {
    return { type: 'number', required: true };
  }
  if (typeName === 'boolean') {
    return { type: 'boolean', required: true };
  }
  return null;
};

// Handle enum types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleEnumType = (typeName: string, zodType: ZodType): any | null => {
  if (typeName === 'enum') {
    // Zod 4: .options is an array of enum values, or extract from entries object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { options } = zodType as any;
    if (Array.isArray(options) && options.length) {
      return { type: options as readonly string[], required: true };
    }
    // Fallback: entries is an object like { male: 'male', female: 'female' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = (zodType as any)._zod?.def?.entries;
    if (entries && typeof entries === 'object') {
      return { type: Object.values(entries) as readonly string[], required: true };
    }
    // Default to string if enum extraction fails
    return { type: 'string', required: true };
  }
  return null;
};

// Handle collection types (array, object)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleCollectionType = (typeName: string): any | null => {
  if (typeName === 'array' || typeName === 'tuple') {
    return { type: 'list', required: true };
  }
  if (typeName === 'object' || typeName === 'record') {
    return { type: 'map', required: true };
  }
  return null;
};

// Handle union and intersection types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleUnionType = (typeName: string): any | null => {
  if (typeName === 'union') {
    return { type: 'any', required: true };
  }
  if (typeName === 'intersection') {
    return { type: 'map', required: true };
  }
  return null;
};

// Handle pipe/transform types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlePipeType = (typeName: string, zodType: ZodType): any | null => {
  if (typeName === 'pipe' || typeName === 'transform') {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return convertZodType(unwrapSchema(zodType));
  }
  return null;
};

// Handle literal types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleLiteralType = (typeName: string, zodType: ZodType): any | null => {
  if (typeName !== 'literal') {
    return null;
  }
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
};

/**
 * Convert a single Zod type to ElectroDB attribute definition
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertZodType = (zodType: ZodType): any => {
  const typeName = getZodTypeName(zodType);

  return (
    handleWrapperType(typeName, zodType) ??
    handlePrimitiveType(typeName) ??
    handleEnumType(typeName, zodType) ??
    handleCollectionType(typeName) ??
    handleUnionType(typeName) ??
    handlePipeType(typeName, zodType) ??
    handleLiteralType(typeName, zodType) ?? { type: 'string', required: true }
  );
};

/**
 * Convert a Zod schema to ElectroDB attributes
 * This ensures Zod is the single source of truth for schema definitions
 *
 * @example
 * ```typescript
 * const personAttributes = zodToElectroDBAttributes(PersonSchema)
 * // Returns: { id: { type: 'string', required: true }, firstName: { type: 'string', required: true }, ... }
 * ```
 */
export const zodToElectroDBAttributes = <TShape extends ZodRawShape>(
  schema: ZodObject<TShape>,
): ElectroDBAttributeResult => {
  const { shape } = schema;
  const attributes: ElectroDBAttributeResult = {};

  for (const [key, zodType] of Object.entries(shape)) {
    attributes[key] = convertZodType(zodType as ZodType);
  }

  return attributes;
};

/**
 * Helper to extract enum values from a Zod enum schema
 * Useful for ElectroDB enum validation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnumValues = (enumSchema: ZodType): readonly string[] =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (enumSchema as any)._zod?.def?.entries ?? (enumSchema as any)._zod?.values ?? [];
