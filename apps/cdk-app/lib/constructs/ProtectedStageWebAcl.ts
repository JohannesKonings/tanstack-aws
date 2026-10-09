import { ArnFormat, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import type { CfnDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { repoPath } from '../repo-root.ts';

const attachLookupHandlerSuppressions = (handler: NodejsFunction): void => {
  NagSuppressions.addResourceSuppressions(
    handler,
    [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'Lambda uses AWS managed policies; replacing with custom policies adds operational overhead for marginal security gain.',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'CloudFront GetDistribution and stack resource listing need distribution and stack ARNs that are resolved at deploy time.',
      },
      {
        id: 'Serverless-LambdaDefaultMemorySize',
        reason: 'WebACL lookup is a single API read during deploy; default memory is sufficient.',
      },
      {
        id: 'Serverless-LambdaDLQ',
        reason: 'CloudFormation surfaces custom resource failures in the stack events.',
      },
      {
        id: 'Serverless-LambdaTracing',
        reason: 'Lookup runs only during deployment; active tracing is not required.',
      },
    ],
    true,
  );
};

const attachProviderSuppressions = (provider: Provider): void => {
  NagSuppressions.addResourceSuppressions(
    provider,
    [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'CDK Provider uses AWS managed policies; cannot replace.',
        appliesTo: [
          'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        ],
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'CDK Provider framework requires broad permissions for custom resource lifecycle.',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'CDK Provider runtime managed by framework.',
      },
      {
        id: 'Serverless-LambdaDefaultMemorySize',
        reason: 'CDK Provider framework default.',
      },
      {
        id: 'Serverless-LambdaDLQ',
        reason: 'CDK Provider; framework handles retries.',
      },
      {
        id: 'Serverless-LambdaLatestVersion',
        reason: 'CDK Provider runtime managed by framework.',
      },
      {
        id: 'Serverless-LambdaTracing',
        reason: 'CDK Provider; low invocation volume.',
      },
    ],
    true,
  );
};

/**
 * Set DistributionConfig.WebACLId from the live distribution when it already
 * exists. A distribution being created for the first time is not in the stack
 * yet, so the lookup copies the WebACL from another distribution in the stack.
 */
export const preserveProtectedStageWebAcl = (
  scope: Construct,
  distribution: CfnDistribution,
): void => {
  const stack = Stack.of(scope);
  const handler = new NodejsFunction(scope, 'ExistingDistributionWebAclLookupHandler', {
    bundling: {
      externalModules: ['@aws-sdk/*'],
    },
    entry: repoPath('src/lambda/distribution-webacl-lookup.ts'),
    runtime: Runtime.NODEJS_24_X,
    timeout: Duration.seconds(30),
  });
  handler.addToRolePolicy(
    new PolicyStatement({
      actions: ['cloudformation:ListStackResources'],
      effect: Effect.ALLOW,
      resources: [stack.stackId],
    }),
  );
  handler.addToRolePolicy(
    new PolicyStatement({
      actions: ['cloudfront:GetDistribution'],
      effect: Effect.ALLOW,
      resources: [
        stack.formatArn({
          arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
          region: '',
          resource: 'distribution',
          resourceName: '*',
          service: 'cloudfront',
        }),
      ],
    }),
  );

  const provider = new Provider(scope, 'ExistingDistributionWebAclLookupProvider', {
    onEventHandler: handler,
  });
  const lookup = new CustomResource(scope, 'ExistingDistributionWebAclLookup', {
    properties: {
      LogicalResourceId: stack.getLogicalId(distribution),
      RefreshToken: Date.now().toString(),
      StackName: stack.stackName,
    },
    resourceType: 'Custom::DistributionWebAclLookup',
    serviceToken: provider.serviceToken,
  });

  attachLookupHandlerSuppressions(handler);
  attachProviderSuppressions(provider);

  distribution.addPropertyOverride('DistributionConfig.WebACLId', lookup.getAttString('WebACLId'));
};
