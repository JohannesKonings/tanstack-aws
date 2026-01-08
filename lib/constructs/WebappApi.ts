import { AccessLogFormat, EndpointType, LambdaRestApi, LogGroupLogDestination, MethodLoggingLevel, ResponseTransferMode } from 'aws-cdk-lib/aws-apigateway';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Duration, RemovalPolicy } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { TIMEOUT_IN_SECONDS } from './type.ts';
import { LogGroup } from 'aws-cdk-lib/aws-logs';

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
    })

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
  }
}
