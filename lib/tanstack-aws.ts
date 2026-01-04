import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Webapp } from './constructs/Webapp.ts';

type TanstackAwsStackProps = cdk.StackProps & {
  appStage: string;
};

export class TanstackAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TanstackAwsStackProps) {
    super(scope, id, props);

    new Webapp(this, 'Webapp', { appStage: props.appStage });
  }
}
