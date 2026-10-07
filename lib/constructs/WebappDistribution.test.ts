import { App, Stack } from 'aws-cdk-lib';
import { MockIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vite-plus/test';
import { WebappDistribution } from './WebappDistribution.ts';

const staticAssetPathPatterns = [
  '/assets/*',
  '/favicon*',
  '/fonts/*',
  '/images/*',
  '/manifest.json',
  '/robots.txt',
];

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

describe('WebappDistribution static asset routing', () => {
  it('sends public favicon, font, manifest, and robots paths to the assets bucket', () => {
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
      appStage: 'dev',
      assetsBucket,
      originBehaviorKind: 'apiGw',
      webappServerApi,
      webappServerFunctionUrl: server.addFunctionUrl(),
    });

    const template = app.synth().getStackByName(stack.stackName).template;
    expect(readCacheBehaviorPathPatterns(template)).toEqual(staticAssetPathPatterns);
  });
});
