import { EndpointType, LambdaRestApi, ResponseTransferMode } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';

type WebappApiProps = {
  webappServer: Function;
};

export class WebappApi extends Construct {
  readonly webappApi: LambdaRestApi;

  constructor(scope: Construct, id: string, props: WebappApiProps) {
    super(scope, id);

    const { webappServer } = props;

    this.webappApi = new LambdaRestApi(this, 'WebappApi', {
      // cloudWatchRole: false,
      // deployOptions: {
      //   dataTraceEnabled: true,
      //   loggingLevel: MethodLoggingLevel.INFO,
      //   metricsEnabled: true,
      //   throttlingBurstLimit: 500,
      //   throttlingRateLimit: 1000,
      //   tracingEnabled: true,
      // },
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      handler: webappServer,
      integrationOptions: {
        responseTransferMode: ResponseTransferMode.STREAM,
      },
    });
  }
}
