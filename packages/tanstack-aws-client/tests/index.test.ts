import { describe, expect, it } from 'vitest';
import { getTanstackAwsClientInfo } from '../src/index.ts';

describe('@tanstack-aws/client', () => {
  it('reports vite-plus-base wiring', () => {
    expect(getTanstackAwsClientInfo()).toEqual({
      label: 'tanstack-aws (vite-plus-base)',
      baseVersion: '0.1.0',
    });
  });
});
