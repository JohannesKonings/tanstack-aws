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
      appLabel: 'Webapp',
      appStage: props.appStage,
      sharedData,
      serverAssetPath: '.output/server',
      publicAssetPath: '.output/public',
    });

    new WorkloadFrontend(this, 'WebappAdmin', {
      appLabel: 'Webapp admin',
      appStage: props.appStage,
      sharedData,
      serverAssetPath: 'apps/webapp-admin/.output/server',
      publicAssetPath: 'apps/webapp-admin/.output/public',
      customHostname: 'admin.tanstack-aws-examples.com',
      // A pricing-plan WebACL can belong to only one distribution. The public
      // webapp owns it, so admin stays without a WebACL.
      attachProtectedWebAcl: false,
    });

    new cdk.CfnOutput(this, 'AuroraClusterArn', {
      exportName: `${this.stackName}-AuroraClusterArn`,
      value: sharedData.auroraClusterArn,
    });
    new cdk.CfnOutput(this, 'AuroraSecretArn', {
      exportName: `${this.stackName}-AuroraSecretArn`,
      value: sharedData.auroraSecretArn,
    });
    new cdk.CfnOutput(this, 'AuroraDatabaseName', {
      exportName: `${this.stackName}-AuroraDatabaseName`,
      value: sharedData.stageDatabaseName,
    });
    new cdk.CfnOutput(this, 'AuroraSchema', {
      exportName: `${this.stackName}-AuroraSchema`,
      value: sharedData.auroraSchema,
    });
  }
}
