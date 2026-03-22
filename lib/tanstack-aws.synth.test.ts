import { App, Mixins, RemovalPolicies, Stack, type StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { mixins as s3Mixins } from 'aws-cdk-lib/aws-s3';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../test/cdk-snapshot.ts';
import { resolveStageLifecycle, resolveStageName } from './stage-name.ts';

type SynthesizedResource = {
  Type: string;
  DeletionPolicy?: string;
  UpdateReplacePolicy?: string;
};

type MinimalTestStackProps = StackProps & {
  appStage: string;
};

class MinimalTestStack extends Stack {
  constructor(scope: Construct, id: string, props: MinimalTestStackProps) {
    super(scope, id, props);

    const assetsBucket = new s3.Bucket(this, 'WebappAssetsBucket');
    assetsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [assetsBucket.arnForObjects('*')],
        principals: [new iam.AnyPrincipal()],
      }),
    );
  }
}

const synthesize = (branchOrStageName: string) => {
  const app = new App();
  const appStage = resolveStageName(branchOrStageName, {
    fallbackStage: 'dev',
    lifecycle: 'permanent',
  });
  const appLifecycle = resolveStageLifecycle(appStage);
  const stack = new MinimalTestStack(app, `TanstackAwsStack-${appStage}`, {
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
  return artifact.template;
};

const synthesizeResources = (branchOrStageName: string): SynthesizedResource[] => {
  const resources = synthesize(branchOrStageName).Resources ?? {};
  return Object.values(resources) as SynthesizedResource[];
};

const synthesizeTemplate = (branchOrStageName: string) => {
  return snapshotSafeTemplate(synthesize(branchOrStageName));
};

describe('TanstackAwsStack synth lifecycle behavior', () => {
  it('matches public-safe snapshot for ephemeral stage', () => {
    expect(synthesizeTemplate('feature/main')).toMatchSnapshot();
  }, 60_000);

  it('matches public-safe snapshot for permanent stage', () => {
    expect(synthesizeTemplate('main')).toMatchSnapshot();
  }, 60_000);

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
  }, 60_000);

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
  }, 60_000);
});
