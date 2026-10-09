import { describe, expect, it } from 'vite-plus/test';
import { resolveWorkloadStack } from './workload-stack.ts';

describe('workload stack', () => {
  it('selects the main stack for the main branch', () => {
    expect(resolveWorkloadStack({ branch: 'main' })).toEqual({
      stackName: 'TanstackAwsStack-main',
      stageName: 'main',
    });
  });

  it('selects the ephemeral stack for a feature branch', () => {
    expect(resolveWorkloadStack({ branch: 'feature/checkout' })).toEqual({
      stackName: 'TanstackAwsStack-feature-checkout',
      stageName: 'feature-checkout',
    });
  });

  it('does not select prod when the branch is named prod', () => {
    expect(resolveWorkloadStack({ branch: 'prod' })).toEqual({
      stackName: 'TanstackAwsStack-feature-prod',
      stageName: 'feature-prod',
    });
  });

  it('lets APP_STAGE override the branch', () => {
    expect(resolveWorkloadStack({ appStage: 'feature/checkout', branch: 'main' })).toEqual({
      stackName: 'TanstackAwsStack-feature-checkout',
      stageName: 'feature-checkout',
    });
  });

  it('selects prod only when APP_STAGE is prod', () => {
    expect(resolveWorkloadStack({ appStage: 'prod', branch: 'feature/checkout' })).toEqual({
      stackName: 'TanstackAwsStack-prod',
      stageName: 'prod',
    });
  });

  it('leaves the stack unset when HEAD is detached and APP_STAGE is absent', () => {
    expect(resolveWorkloadStack({ branch: undefined })).toBeUndefined();
    expect(resolveWorkloadStack({ branch: 'HEAD' })).toBeUndefined();
  });
});
