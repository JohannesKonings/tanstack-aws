import { createServerFn } from '@tanstack/react-start';

function randomInitialValue(): string {
  return `initial-${Math.random().toString(36).slice(2, 10)}`;
}

/** In-memory store for SSO demo value (public and internal). */
const store: { public: string; internal: string } = {
  public: randomInitialValue(),
  internal: randomInitialValue(),
};

export function getStoredValue(scope: 'public' | 'internal'): string {
  return store[scope];
}

export function setStoredValue(scope: 'public' | 'internal', value: string): void {
  store[scope] = value;
}

export const getSsoPublicValue = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string> => getStoredValue('public'),
);

export const setSsoPublicValue = createServerFn({ method: 'POST' })
  .inputValidator((data: string) => data)
  .handler(async ({ data }): Promise<string> => {
    setStoredValue('public', data);
    return data;
  });

export const getSsoInternalValue = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string> => getStoredValue('internal'),
);

export const setSsoInternalValue = createServerFn({ method: 'POST' })
  .inputValidator((data: string) => data)
  .handler(async ({ data }): Promise<string> => {
    setStoredValue('internal', data);
    return data;
  });
