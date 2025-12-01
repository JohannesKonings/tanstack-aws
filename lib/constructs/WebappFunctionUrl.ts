import { Function, FunctionUrl, FunctionUrlAuthType, InvokeMode } from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';

type WebappFunctionUrlProps = {
  webappServer: Function;
};

export class WebappFunctionUrl extends Construct {
  readonly webappServerFunctionUrl: FunctionUrl;

  constructor(scope: Construct, id: string, props: WebappFunctionUrlProps) {
    super(scope, id);

    const { webappServer } = props;

    this.webappServerFunctionUrl = webappServer.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
      invokeMode: InvokeMode.RESPONSE_STREAM,
    });
  }
}
