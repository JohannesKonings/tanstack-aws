import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Webapp } from './constructs/Webapp.ts';

export class TanstackAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new Webapp(this, 'Webapp', {});
  }
}
