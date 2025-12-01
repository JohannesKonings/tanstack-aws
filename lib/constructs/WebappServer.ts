import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';

import { Duration, Tags } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import path from 'node:path';

export class WebappServer extends Construct {
  readonly webappServer: Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.webappServer = new Function(this, 'WebappServer', {
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
    Tags.of(this.webappServer).add('IsWebAppServer', 'true');

    this.webappServer.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        effect: Effect.ALLOW,
        resources: ['*'],
      }),
    );
  }
}
