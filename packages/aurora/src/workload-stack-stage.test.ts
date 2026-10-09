import { describe, expect, it } from 'vite-plus/test';
import { resolveWorkloadStackStage } from './workload-stack-stage.ts';

describe('workload stack stage', () => {
  it('selects the main stack for the main branch', () => {
    expect(resolveWorkloadStackStage({ branch: 'main' })).toEqual({
      databaseName: 'main',
      stackName: 'TanstackAwsStack-main',
      stageName: 'main',
    });
  });

  it('selects the ephemeral stack for a feature branch', () => {
    expect(resolveWorkloadStackStage({ branch: 'feature/checkout' })).toEqual({
      databaseName: 'feature_checkout',
      stackName: 'TanstackAwsStack-feature-checkout',
      stageName: 'feature-checkout',
    });
  });

  it('does not select prod when the branch is named prod', () => {
    expect(resolveWorkloadStackStage({ branch: 'prod' })).toEqual({
      databaseName: 'feature_prod',
      stackName: 'TanstackAwsStack-feature-prod',
      stageName: 'feature-prod',
    });
  });

  it('lets APP_STAGE override the branch', () => {
    expect(resolveWorkloadStackStage({ appStage: 'feature/checkout', branch: 'main' })).toEqual({
      databaseName: 'feature_checkout',
      stackName: 'TanstackAwsStack-feature-checkout',
      stageName: 'feature-checkout',
    });
  });

  it('selects prod only when APP_STAGE is prod', () => {
    expect(resolveWorkloadStackStage({ appStage: 'prod', branch: 'feature/checkout' })).toEqual({
      databaseName: 'prod',
      stackName: 'TanstackAwsStack-prod',
      stageName: 'prod',
    });
  });

  it('leaves the stack unset when HEAD is detached and APP_STAGE is absent', () => {
    expect(resolveWorkloadStackStage({ branch: undefined })).toBeUndefined();
    expect(resolveWorkloadStackStage({ branch: 'HEAD' })).toBeUndefined();
  });
});
