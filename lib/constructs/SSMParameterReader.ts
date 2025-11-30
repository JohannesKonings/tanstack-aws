import { Arn, Stack } from 'aws-cdk-lib';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  type AwsSdkCall,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface SSMParameterReaderProps {
  parameterName: string;
  region: string;
}

const removeLeadingSlash = (value: string): string => {
  const LEADING_SLASH_LENGTH = 1;
  if (value.startsWith('/')) {
    return value.slice(LEADING_SLASH_LENGTH);
  }
  return value;
};

/**
 * Custom resource to read SSM parameters from a different AWS region.
 * Based on: https://aws.amazon.com/blogs/infrastructure-and-automation/read-parameters-across-aws-regions-with-aws-cloudformation-custom-resources/
 */
export class SSMParameterReader extends AwsCustomResource {
  constructor(scope: Construct, name: string, props: SSMParameterReaderProps) {
    const { parameterName, region } = props;

    const ssmAwsSdkCall: AwsSdkCall = {
      action: 'getParameter',
      parameters: {
        Name: parameterName,
      },
      physicalResourceId: PhysicalResourceId.of(Date.now().toString()),
      region,
      service: 'SSM',
    };

    const ssmCrPolicy = AwsCustomResourcePolicy.fromSdkCalls({
      resources: [
        Arn.format(
          {
            region: props.region,
            resource: 'parameter',
            resourceName: removeLeadingSlash(parameterName),
            service: 'ssm',
          },
          Stack.of(scope),
        ),
      ],
    });

    super(scope, name, { onUpdate: ssmAwsSdkCall, policy: ssmCrPolicy });
  }

  public getParameterValue(): string {
    return this.getResponseField('Parameter.Value').toString();
  }
}
