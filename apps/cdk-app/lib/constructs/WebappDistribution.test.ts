import { App, Stack } from 'aws-cdk-lib';
import { MockIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vite-plus/test';
import { WebappDistribution } from './WebappDistribution.ts';

const staticAssetPathPatterns = ['/assets/*'];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readPathPattern = (behavior: unknown): string | undefined => {
  if (!isRecord(behavior)) {
    return undefined;
  }

  const pathPattern = behavior.PathPattern;
  return typeof pathPattern === 'string' ? pathPattern : undefined;
};

const readDistributionWebAclIds = (template: unknown): unknown[] => {
  if (!isRecord(template) || !isRecord(template.Resources)) {
    return [];
  }

  const webAclIds: unknown[] = [];
  for (const resource of Object.values(template.Resources)) {
    if (!isRecord(resource) || resource.Type !== 'AWS::CloudFront::Distribution') {
      continue;
    }
    if (!isRecord(resource.Properties) || !isRecord(resource.Properties.DistributionConfig)) {
      continue;
    }
    webAclIds.push(resource.Properties.DistributionConfig.WebACLId);
  }
  return webAclIds;
};

const readCacheBehaviorPathPatterns = (template: unknown): string[] => {
  if (!isRecord(template) || !isRecord(template.Resources)) {
    return [];
  }

  const patterns: string[] = [];
  for (const resource of Object.values(template.Resources)) {
    if (!isRecord(resource) || resource.Type !== 'AWS::CloudFront::Distribution') {
      continue;
    }
    if (!isRecord(resource.Properties) || !isRecord(resource.Properties.DistributionConfig)) {
      continue;
    }

    const { CacheBehaviors: cacheBehaviors } = resource.Properties.DistributionConfig;
    if (!Array.isArray(cacheBehaviors)) {
      continue;
    }

    for (const behavior of cacheBehaviors) {
      const pathPattern = readPathPattern(behavior);
      if (pathPattern) {
        patterns.push(pathPattern);
      }
    }
  }

  return patterns;
};

const synthesizeDistribution = (
  appStage: string,
  attachProtectedWebAcl?: boolean,
): unknown => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  const assetsBucket = new Bucket(stack, 'AssetsBucket');
  const server = new Function(stack, 'Server', {
    code: Code.fromInline('exports.handler = async () => ({ statusCode: 200 });'),
    handler: 'index.handler',
    runtime: Runtime.NODEJS_24_X,
  });
  const webappServerApi = new RestApi(stack, 'Api');
  webappServerApi.root.addMethod('GET', new MockIntegration());

  new WebappDistribution(stack, 'WebappDistribution', {
    appStage,
    assetsBucket,
    ...(attachProtectedWebAcl === undefined ? {} : { attachProtectedWebAcl }),
    description: `tanstack-aws Webapp (${appStage})`,
    originBehaviorKind: 'apiGw',
    webappServerApi,
    webappServerFunctionUrl: server.addFunctionUrl(),
  });

  return app.synth().getStackByName(stack.stackName).template;
};

describe('WebappDistribution static asset routing', () => {
  it('sends public favicon, font, manifest, and robots paths to the assets bucket', () => {
    const template = synthesizeDistribution('dev');

    expect(readCacheBehaviorPathPatterns(template)).toEqual(staticAssetPathPatterns);
    expect(readDistributionWebAclIds(template)).toEqual([undefined]);
  });

  it('sets a protected-stage WebACL from the deploy-time lookup', () => {
    const template = synthesizeDistribution('main');
    const webAclIds = readDistributionWebAclIds(template);

    expect(webAclIds).toEqual([
      {
        'Fn::GetAtt': [expect.stringContaining('ExistingDistributionWebAclLookup'), 'WebACLId'],
      },
    ]);
  });

  it('omits the protected-stage WebACL when attachment is disabled', () => {
    const template = synthesizeDistribution('prod', false);

    expect(readDistributionWebAclIds(template)).toEqual([undefined]);
  });
});
