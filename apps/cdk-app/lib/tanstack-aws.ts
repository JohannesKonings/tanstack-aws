import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SharedWorkloadData } from './constructs/SharedWorkloadData.ts';
import { WorkloadFrontend } from './constructs/WorkloadFrontend.ts';

type TanstackAwsStackProps = cdk.StackProps & {
  appStage: string;
};

export class TanstackAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TanstackAwsStackProps) {
    super(scope, id, props);

    const sharedData = new SharedWorkloadData(this, 'SharedWorkloadData', {
      appStage: props.appStage,
    });

    new WorkloadFrontend(this, 'Webapp', {
      appStage: props.appStage,
      sharedData,
      serverAssetPath: '.output/server',
      publicAssetPath: '.output/public',
    });

    new WorkloadFrontend(this, 'WebappAdmin', {
      appStage: props.appStage,
      sharedData,
      serverAssetPath: 'apps/webapp-admin/.output/server',
      publicAssetPath: 'apps/webapp-admin/.output/public',
      customHostname: 'admin.tanstack-aws-examples.com',
    });
  }
}
