import { Duration, Stack } from 'aws-cdk-lib/core';
import { RequestAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { IdentitySource } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export type WebappApiAuthorizerProps = {
  /** Optional base URL for JWKS (e.g. CloudFront). If not set, authorizer derives from methodArn or reads from SSM. */
  apiBaseUrl?: string;
  /** Optional SSM parameter name to read CloudFront URL from. Used when apiBaseUrl is not provided. */
  ssmParameterName?: string;
};

export class WebappApiAuthorizer extends Construct {
  readonly authorizer: RequestAuthorizer;
  readonly authorizerFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: WebappApiAuthorizerProps = {}) {
    super(scope, id);

    const { apiBaseUrl, ssmParameterName } = props;

    const environment: Record<string, string> = {};
    if (apiBaseUrl) {
      environment.API_BASE_URL = apiBaseUrl;
    }
    if (ssmParameterName) {
      environment.SSM_PARAMETER_NAME = ssmParameterName;
    }

    this.authorizerFunction = new NodejsFunction(this, 'Authorizer', {
      entry: 'src/lambda/api-gateway-authorizer.ts',
      runtime: Runtime.NODEJS_22_X,
      handler: 'handler',
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: Object.keys(environment).length > 0 ? environment : undefined,
      bundling: {
        minify: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Grant permission to read from SSM parameter if specified
    if (ssmParameterName) {
      const stack = Stack.of(scope);
      const parameterName = ssmParameterName.startsWith('/') ? ssmParameterName : `/${ssmParameterName}`;
      this.authorizerFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ssm:GetParameter'],
          resources: [`arn:aws:ssm:${stack.region}:${stack.account}:parameter${parameterName}`],
        }),
      );
    }

    // Use path and httpMethod so GET and POST are cached separately (e.g. POST with admin
    // is not denied by a cached result from GET with viewer). Do not add cookie/authorization
    // or API Gateway would require them before invoking and would 401 requests without cookies.
    this.authorizer = new RequestAuthorizer(this, 'RequestAuthorizer', {
      handler: this.authorizerFunction,
      identitySources: [
        IdentitySource.context('path'),
        IdentitySource.context('httpMethod'),
      ],
      resultsCacheTtl: Duration.minutes(5),
    });
  }
}
