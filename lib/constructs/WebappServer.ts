import {
  Code,
  Function,
  FunctionUrl,
  FunctionUrlAuthType,
  InvokeMode,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import { Duration, Tags } from 'aws-cdk-lib';
import path from 'node:path';

type WebappServerProps = {};

export class WebappServer extends Construct {
  readonly webappServerFunctionUrl: FunctionUrl;

  constructor(scope: Construct, id: string, props?: WebappServerProps) {
    super(scope, id);

    const webappServer = new Function(this, 'WebappServer', {
      code: Code.fromAsset(
        path.join(path.dirname(new URL(import.meta.url).pathname), '../../.output/server'),
      ),
      // functionName: PhysicalName.GENERATE_IF_NEEDED,
      handler: 'index.handler',
      memorySize: 2048,
      runtime: Runtime.NODEJS_24_X,
      // oxlint-disable-next-line no-magic-numbers
      timeout: Duration.seconds(60),
    });
    Tags.of(webappServer).add('IsWebAppServer', 'true');

    this.webappServerFunctionUrl = webappServer.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
      invokeMode: InvokeMode.RESPONSE_STREAM,
    });
  }
}
