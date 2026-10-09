import { describe, expect, it } from 'vite-plus/test';
import { resolveStageDatabaseName } from './stage-database-name.ts';

describe('stage database name', () => {
  it('names the main stage database main', () => {
    expect(resolveStageDatabaseName('main')).toBe('main');
  });

  it('names the prod stage database prod', () => {
    expect(resolveStageDatabaseName('prod')).toBe('prod');
  });

  it('names a feature stage database from the stage identifier', () => {
    expect(resolveStageDatabaseName('feature-checkout')).toBe('feature_checkout');
  });
});
