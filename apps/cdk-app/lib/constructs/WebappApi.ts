import {
  AccessLogFormat,
  EndpointType,
  LambdaRestApi,
  LogGroupLogDestination,
  MethodLoggingLevel,
  ResponseTransferMode,
} from 'aws-cdk-lib/aws-apigateway';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib/core';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { TIMEOUT_IN_SECONDS } from './type.ts';

type WebappApiProps = {
  webappServer: Function;
};

export class WebappApi extends Construct {
  readonly webappApi: LambdaRestApi;

  constructor(scope: Construct, id: string, props: WebappApiProps) {
    super(scope, id);

    const { webappServer } = props;

    const logGroupAccessLogs = new LogGroup(this, 'WebappApiLogGroup', {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_MONTH,
    });

    this.webappApi = new LambdaRestApi(this, 'WebappApi', {
      cloudWatchRole: true,
      deployOptions: {
        dataTraceEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true,
        throttlingBurstLimit: 500,
        throttlingRateLimit: 1000,
        tracingEnabled: true,
        accessLogDestination: new LogGroupLogDestination(logGroupAccessLogs),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },

      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      handler: webappServer,
      integrationOptions: {
        responseTransferMode: ResponseTransferMode.STREAM,
        timeout: Duration.seconds(TIMEOUT_IN_SECONDS),
      },
    });

    NagSuppressions.addResourceSuppressions(
      this.webappApi,
      [
        {
          id: 'AwsSolutions-APIG2',
          reason: 'API is a proxy; validation handled in Lambda backend.',
        },
        {
          id: 'AwsSolutions-APIG3',
          reason: 'WAF applied at CloudFront for prod/main; API Gateway behind CloudFront.',
        },
        {
          id: 'AwsSolutions-APIG4',
          reason: 'API fronted by CloudFront with IAM-signed requests; authorization at edge.',
        },
        {
          id: 'AwsSolutions-COG4',
          reason: 'API fronted by CloudFront with IAM; Cognito not used for this demo.',
        },
        {
          id: 'AwsSolutions-IAM4',
          reason: 'API Gateway CloudWatch role uses AWS managed policy per design.',
          appliesTo: [
            'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs',
          ],
        },
        {
          id: 'CdkNagValidationFailure',
          reason:
            'Serverless-APIGWStructuredLogging fails on intrinsic refs; API has structured logging configured.',
        },
      ],
      true,
    );
  }
}
