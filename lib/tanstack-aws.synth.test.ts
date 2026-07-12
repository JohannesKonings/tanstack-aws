import { BlocksBackend } from '@aws-blocks/blocks/cdk';
import { App, RemovalPolicies, Stack, type StackProps, Tags } from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../test/cdk-snapshot.ts';
import { blocksBackendPaths } from './blocks-backend-paths.ts';
import { APPLICATION_RESOURCE_SCOPE_TAG_VALUE, RESOURCE_SCOPE_TAG_KEY } from './resource-tags.ts';
import { resolveStageLifecycle, resolveStageName } from './stage-name.ts';

type SynthesizedResource = {
  Type: string;
  DeletionPolicy?: string;
  UpdateReplacePolicy?: string;
};

type LifecycleTestStackProps = StackProps & {
  appStage: string;
};

class LifecycleTestStack extends Stack {
  constructor(scope: Construct, id: string, props: LifecycleTestStackProps) {
    super(scope, id, props);
    Tags.of(this).add(RESOURCE_SCOPE_TAG_KEY, APPLICATION_RESOURCE_SCOPE_TAG_VALUE);

    const autoDeleteObjects = resolveStageLifecycle(props.appStage) === 'ephemeral';
    const assetsBucket = new s3.Bucket(this, 'WebappAssetsBucket', {
      autoDeleteObjects,
      removalPolicy: autoDeleteObjects ? RemovalPolicy.DESTROY : undefined,
    });
    assetsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [assetsBucket.arnForObjects('*')],
        principals: [new iam.AnyPrincipal()],
      }),
    );
  }
}

const ensureCdkConditionActive = (): void => {
  const nodeOptions = process.env.NODE_OPTIONS ?? '';
  if (!nodeOptions.includes('--conditions=cdk')) {
    process.env.NODE_OPTIONS = nodeOptions ? `${nodeOptions} --conditions=cdk` : '--conditions=cdk';
  }
};

const synthesizeArtifact = async (branchOrStageName: string) => {
  ensureCdkConditionActive();

  const app = new App();
  const appStage = resolveStageName(branchOrStageName, {
    fallbackStage: 'dev',
    lifecycle: 'permanent',
  });
  const appLifecycle = resolveStageLifecycle(appStage);
  const stack = new LifecycleTestStack(app, `TanstackAwsStack-${appStage}`, {
    appStage,
    env: {
      account: '123456789012',
      region: 'us-east-2',
    },
  });

  if (appLifecycle === 'ephemeral') {
    RemovalPolicies.of(app).destroy();
  }

  await BlocksBackend.create(stack, 'BlocksBackend', blocksBackendPaths);

  const assembly = app.synth();
  return assembly.getStackArtifact(stack.artifactId);
};

const synthesize = async (branchOrStageName: string) => {
  return (await synthesizeArtifact(branchOrStageName)).template;
};

const findResourceById = (
  resources: Record<string, SynthesizedResource & { Type: string }>,
  idFragment: string,
  type?: string,
): (SynthesizedResource & { Type: string }) | undefined => {
  const entry = Object.entries(resources).find(
    ([id, resource]) => id.includes(idFragment) && (type === undefined || resource.Type === type),
  );
  return entry?.[1];
};

const synthesizeResourcesById = async (
  branchOrStageName: string,
): Promise<Record<string, SynthesizedResource & { Type: string }>> => {
  const artifact = await synthesizeArtifact(branchOrStageName);
  const resources = artifact.template.Resources ?? {};
  const result: Record<string, SynthesizedResource & { Type: string }> = {};

  for (const [id, resource] of Object.entries(resources)) {
    if (typeof resource !== 'object' || resource === null) {
      continue;
    }

    const type = Reflect.get(resource, 'Type');
    if (typeof type === 'string') {
      result[id] = resource as SynthesizedResource & { Type: string };
    }
  }

  return result;
};

const synthesizeTemplate = async (branchOrStageName: string) => {
  return snapshotSafeTemplate(await synthesize(branchOrStageName));
};

describe('TanstackAwsStack synth lifecycle behavior', () => {
  it('matches public-safe snapshot for ephemeral stage', async () => {
    expect(await synthesizeTemplate('feature/main')).toMatchSnapshot();
  }, 120_000);

  it('matches public-safe snapshot for permanent stage', async () => {
    expect(await synthesizeTemplate('main')).toMatchSnapshot();
  }, 120_000);

  it('marks ephemeral resources for full stack cleanup', async () => {
    const resources = await synthesizeResourcesById('feature/main');

    const retainedResources = Object.entries(resources).filter(
      ([, resource]) =>
        resource.DeletionPolicy === 'Retain' || resource.UpdateReplacePolicy === 'Retain',
    );
    expect(retainedResources).toEqual([]);

    const assetsBucket = findResourceById(resources, 'WebappAssetsBucket');
    expect(assetsBucket?.Type).toBe('AWS::S3::Bucket');
    expect(assetsBucket?.DeletionPolicy).toBe('Delete');
    expect(assetsBucket?.UpdateReplacePolicy).toBe('Delete');

    const blocksHandler = findResourceById(
      resources,
      'BlocksBackendHandler',
      'AWS::Lambda::Function',
    );
    expect(blocksHandler?.Type).toBe('AWS::Lambda::Function');
    expect(blocksHandler?.DeletionPolicy).toBe('Delete');
    expect(blocksHandler?.UpdateReplacePolicy).toBe('Delete');
  }, 120_000);

  it('keeps permanent stack retention defaults', async () => {
    const resources = await synthesizeResourcesById('main');

    const assetsBucket = findResourceById(resources, 'WebappAssetsBucket');
    expect(assetsBucket?.Type).toBe('AWS::S3::Bucket');
    expect(assetsBucket?.DeletionPolicy).toBe('Retain');
    expect(assetsBucket?.UpdateReplacePolicy).toBe('Retain');

    const blocksHandler = findResourceById(
      resources,
      'BlocksBackendHandler',
      'AWS::Lambda::Function',
    );
    expect(blocksHandler?.Type).toBe('AWS::Lambda::Function');
    expect(blocksHandler?.DeletionPolicy).toBeUndefined();
    expect(blocksHandler?.UpdateReplacePolicy).toBeUndefined();
  }, 120_000);

  it('applies mandatory application-wide resource tag', async () => {
    const template = await synthesize('main');
    const resources = Object.values(
      (
        template as {
          Resources?: Record<string, { Type?: string; Properties?: { Tags?: unknown[] } }>;
        }
      ).Resources ?? {},
    );

    const bucket = resources.find((resource) => resource.Type === 'AWS::S3::Bucket');
    expect(bucket?.Properties?.Tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Key: RESOURCE_SCOPE_TAG_KEY,
          Value: APPLICATION_RESOURCE_SCOPE_TAG_VALUE,
        }),
      ]),
    );
  }, 120_000);
});
