import { describe, expect, it } from 'vite-plus/test';
import { resolveStageLifecycle, resolveStageName } from './stage-name.ts';

describe('resolveStageName', () => {
  it('normalizes invalid characters', () => {
    expect(resolveStageName('Feature/New API')).toBe('feature-new-api');
  });

  it('truncates stage names to maxLength', () => {
    expect(
      resolveStageName('feature-this-name-is-way-too-long-for-stage', {
        maxLength: 20,
      }),
    ).toBe('feature-this-name-is');
  });

  it('prefixes reserved names in ephemeral lifecycle', () => {
    expect(
      resolveStageName('main', {
        lifecycle: 'ephemeral',
      }),
    ).toBe('feature-main');
  });

  it('prefixes prod in ephemeral lifecycle', () => {
    expect(
      resolveStageName('prod', {
        lifecycle: 'ephemeral',
      }),
    ).toBe('feature-prod');
  });

  it('keeps reserved names in permanent lifecycle', () => {
    expect(
      resolveStageName('prod', {
        lifecycle: 'permanent',
      }),
    ).toBe('prod');
  });

  it('returns deterministic output for deploy and destroy style refs', () => {
    const featureBranch = 'feature/main';
    const deployStage = resolveStageName(featureBranch, { lifecycle: 'ephemeral' });
    const destroyStage = resolveStageName(featureBranch, { lifecycle: 'ephemeral' });

    expect(deployStage).toBe('feature-main');
    expect(destroyStage).toBe(deployStage);
  });
});

describe('resolveStageLifecycle', () => {
  it('classifies main as permanent', () => {
    expect(resolveStageLifecycle('main')).toBe('permanent');
  });

  it('classifies prod as permanent', () => {
    expect(resolveStageLifecycle('prod')).toBe('permanent');
  });

  it('classifies non-reserved names as ephemeral', () => {
    expect(resolveStageLifecycle('feature-checkout')).toBe('ephemeral');
  });
});
