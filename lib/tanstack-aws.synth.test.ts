import { App, Mixins, RemovalPolicies } from 'aws-cdk-lib';
import { mixins as s3Mixins } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vitest';
import { resolveStageLifecycle, resolveStageName } from './stage-name.ts';
import { TanstackAwsStack } from './tanstack-aws.ts';

type SynthesizedResource = {
  Type: string;
  DeletionPolicy?: string;
  UpdateReplacePolicy?: string;
};

const synthesizeResources = (branchOrStageName: string): SynthesizedResource[] => {
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

  const assembly = app.synth();
  const artifact = assembly.getStackArtifact(stack.artifactId);
  const resources = artifact.template.Resources ?? {};
  return Object.values(resources) as SynthesizedResource[];
};

describe('TanstackAwsStack synth lifecycle behavior', () => {
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
