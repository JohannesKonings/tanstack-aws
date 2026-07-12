import { describe, expect, test } from 'vite-plus/test';
import { blocksSidecarPlugin } from './vite-blocks-sidecar-plugin.ts';

describe('blocksSidecarPlugin', () => {
  test('registers a serve-only plugin with configureServer hook', () => {
    const plugin = blocksSidecarPlugin();

    expect(plugin.name).toBe('blocks-sidecar');
    expect(plugin.apply).toBe('serve');
    expect(typeof plugin.configureServer).toBe('function');
  });
});
