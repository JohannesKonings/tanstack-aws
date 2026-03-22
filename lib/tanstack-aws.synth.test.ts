import { spawnSync } from 'node:child_process';
import { App, Mixins, RemovalPolicies } from 'aws-cdk-lib';
import { mixins as s3Mixins } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../test/cdk-snapshot.ts';
import { resolveStageLifecycle, resolveStageName } from './stage-name.ts';
import { TanstackAwsStack } from './tanstack-aws.ts';

type SynthesizedResource = {
  Type: string;
  DeletionPolicy?: string;
  UpdateReplacePolicy?: string;
};

function emitDebugLog(
  runId: 'pre-fix' | 'post-fix',
  hypothesisId: 'H1' | 'H2' | 'H3' | 'H4',
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  fetch('http://127.0.0.1:7480/ingest/0e26e187-bdfa-4d4d-a1f4-89b326299185', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd62998' },
    body: JSON.stringify({
      sessionId: 'd62998',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function probeCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const errorCode =
    result.error &&
    typeof result.error === 'object' &&
    'code' in result.error &&
    typeof result.error.code === 'string'
      ? result.error.code
      : null;
  return {
    command: [command, ...args].join(' '),
    status: result.status,
    errorCode,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

function emitBundlingProbe(runId: 'pre-fix' | 'post-fix') {
  const pnpmVersion = probeCommand('pnpm', ['--version']);
  const esbuildViaPnpm = probeCommand('pnpm', ['exec', '--', 'esbuild', '--version']);
  const esbuildViaVp = probeCommand('vp', ['exec', '--', 'esbuild', '--version']);

  emitDebugLog(
    runId,
    'H1',
    'lib/tanstack-aws.synth.test.ts:emitBundlingProbe',
    'pnpm/esbuild probe results',
    {
      pnpmStatus: pnpmVersion.status,
      pnpmErrorCode: pnpmVersion.errorCode,
      esbuildViaPnpmStatus: esbuildViaPnpm.status,
      esbuildViaPnpmErrorCode: esbuildViaPnpm.errorCode,
      esbuildViaVpStatus: esbuildViaVp.status,
      esbuildViaVpErrorCode: esbuildViaVp.errorCode,
    },
  );
  emitDebugLog(
    runId,
    'H2',
    'lib/tanstack-aws.synth.test.ts:emitBundlingProbe',
    'pnpm/esbuild stderr probe',
    {
      pnpmStderr: pnpmVersion.stderr,
      esbuildViaPnpmStderr: esbuildViaPnpm.stderr,
      esbuildViaVpStderr: esbuildViaVp.stderr,
    },
  );
}

const synthesizeResources = (branchOrStageName: string): SynthesizedResource[] => {
  emitBundlingProbe('pre-fix');
  const app = new App();
  const appStage = resolveStageName(branchOrStageName, {
    fallbackStage: 'dev',
    lifecycle: 'permanent',
  });
  const appLifecycle = resolveStageLifecycle(appStage);
  const stack = new TanstackAwsStack(app, `TanstackAwsStack-${appStage}`, {
    appStage,
    env: {
      account: '123456789012',
      region: 'us-east-2',
    },
  });

  if (appLifecycle === 'ephemeral') {
    // Match app bootstrap orchestration: enforce ephemeral cleanup at app scope.
    RemovalPolicies.of(app).destroy();
    Mixins.of(app).apply(new s3Mixins.BucketAutoDeleteObjects());
  }

  emitDebugLog(
    'pre-fix',
    'H3',
    'lib/tanstack-aws.synth.test.ts:synthesizeResources',
    'Synth about to run',
    { appStage, appLifecycle },
  );
  let assembly;
  try {
    assembly = app.synth();
  } catch (error) {
    emitDebugLog(
      'pre-fix',
      'H4',
      'lib/tanstack-aws.synth.test.ts:synthesizeResources',
      'Synth failed with runtime error',
      { error: String(error) },
    );
    throw error;
  }
  const artifact = assembly.getStackArtifact(stack.artifactId);
  const resources = artifact.template.Resources ?? {};
  return Object.values(resources) as SynthesizedResource[];
};

const synthesizeTemplate = (branchOrStageName: string) => {
  emitBundlingProbe('pre-fix');
  const app = new App();
  const appStage = resolveStageName(branchOrStageName, {
    fallbackStage: 'dev',
    lifecycle: 'permanent',
  });
  const appLifecycle = resolveStageLifecycle(appStage);
  const stack = new TanstackAwsStack(app, `TanstackAwsStack-${appStage}`, {
    appStage,
    env: {
      account: '123456789012',
      region: 'us-east-2',
    },
  });

  if (appLifecycle === 'ephemeral') {
    // Match app bootstrap orchestration: enforce ephemeral cleanup at app scope.
    RemovalPolicies.of(app).destroy();
    Mixins.of(app).apply(new s3Mixins.BucketAutoDeleteObjects());
  }

  emitDebugLog(
    'pre-fix',
    'H3',
    'lib/tanstack-aws.synth.test.ts:synthesizeTemplate',
    'Synth about to run',
    { appStage, appLifecycle },
  );
  let assembly;
  try {
    assembly = app.synth();
  } catch (error) {
    emitDebugLog(
      'pre-fix',
      'H4',
      'lib/tanstack-aws.synth.test.ts:synthesizeTemplate',
      'Synth failed with runtime error',
      { error: String(error) },
    );
    throw error;
  }
  const artifact = assembly.getStackArtifact(stack.artifactId);
  return snapshotSafeTemplate(artifact.template);
};

describe('TanstackAwsStack synth lifecycle behavior', () => {
  it('matches public-safe snapshot for ephemeral stage', () => {
    expect(synthesizeTemplate('feature/main')).toMatchSnapshot();
  });

  it('matches public-safe snapshot for permanent stage', () => {
    expect(synthesizeTemplate('main')).toMatchSnapshot();
  });

  it('marks ephemeral resources for full stack cleanup', () => {
    const resources = synthesizeResources('feature/main');

    const retainedResources = resources.filter(
      (resource) =>
        resource.DeletionPolicy === 'Retain' || resource.UpdateReplacePolicy === 'Retain',
    );

    expect(retainedResources).toEqual([]);

    const s3Buckets = resources.filter((resource) => resource.Type === 'AWS::S3::Bucket');
    expect(s3Buckets.length).toBeGreaterThan(0);
    for (const bucket of s3Buckets) {
      expect(bucket.DeletionPolicy).toBe('Delete');
      expect(bucket.UpdateReplacePolicy).toBe('Delete');
    }

    const bucketPolicies = resources.filter(
      (resource) => resource.Type === 'AWS::S3::BucketPolicy',
    );
    expect(bucketPolicies.length).toBeGreaterThan(0);
    for (const bucketPolicy of bucketPolicies) {
      expect(bucketPolicy.DeletionPolicy).toBe('Delete');
      expect(bucketPolicy.UpdateReplacePolicy).toBe('Delete');
    }
  });

  it('keeps permanent stack retention defaults', () => {
    const resources = synthesizeResources('main');

    const s3Buckets = resources.filter((resource) => resource.Type === 'AWS::S3::Bucket');
    expect(s3Buckets.length).toBeGreaterThan(0);
    for (const bucket of s3Buckets) {
      expect(bucket.DeletionPolicy).toBe('Retain');
      expect(bucket.UpdateReplacePolicy).toBe('Retain');
    }

    const bucketPolicies = resources.filter(
      (resource) => resource.Type === 'AWS::S3::BucketPolicy',
    );
    expect(bucketPolicies.length).toBeGreaterThan(0);
    for (const bucketPolicy of bucketPolicies) {
      expect(bucketPolicy.DeletionPolicy).toBeUndefined();
      expect(bucketPolicy.UpdateReplacePolicy).toBeUndefined();
    }
  });
});
