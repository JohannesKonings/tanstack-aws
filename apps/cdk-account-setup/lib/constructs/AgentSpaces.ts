import { Stack, Validations } from 'aws-cdk-lib';
import * as devopsagent from 'aws-cdk-lib/aws-devopsagent';
import { ArnPrincipal, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as securityagent from 'aws-cdk-lib/aws-securityagent';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

const SECURITY_AGENT_SPACE_NAME = 'tanstack-aws-security';
const DEVOPS_AGENT_SPACE_NAME = 'tanstack-aws-devops';
const DEVOPS_AGENT_SERVICE_PRINCIPAL = 'aidevops.amazonaws.com';
const DEVOPS_AGENT_ACCESS_POLICY = 'AIDevOpsAgentAccessPolicy';

export type AgentSpacesProps = {
  readonly securityAgent: boolean;
  readonly devopsAgent: boolean;
};

/** Security Agent and DevOps Agent spaces for this account in the workload region. */
export class AgentSpaces extends Construct {
  constructor(scope: Construct, id: string, props: AgentSpacesProps) {
    super(scope, id);

    if (props.securityAgent) {
      const securityAgentSpace = new securityagent.CfnAgentSpace(this, 'SecurityAgentSpace', {
        name: SECURITY_AGENT_SPACE_NAME,
      });
      acknowledgeStaleRegionSchema(securityAgentSpace);
    }

    if (!props.devopsAgent) {
      return;
    }

    const { account, region, partition } = Stack.of(this);
    const operatorRole = new Role(this, 'OperatorRole', {
      assumedBy: new ArnPrincipal(`arn:${partition}:iam::${account}:root`),
      description: 'Lets principals in this account open the DevOps Agent web app.',
    });
    const assumableRole = new Role(this, 'AssumableRole', {
      assumedBy: new ServicePrincipal(DEVOPS_AGENT_SERVICE_PRINCIPAL, {
        conditions: {
          StringEquals: {
            'aws:SourceAccount': account,
          },
          ArnLike: {
            'aws:SourceArn': `arn:${partition}:aidevops:${region}:${account}:agentspace/*`,
          },
        },
      }),
      description: 'Role AWS DevOps Agent assumes to monitor this account.',
    });
    assumableRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(DEVOPS_AGENT_ACCESS_POLICY),
    );
    NagSuppressions.addResourceSuppressions(assumableRole, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'AWS DevOps Agent requires the AWS-managed AIDevOpsAgentAccessPolicy so investigation permissions stay current as AWS adds resource types.',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/AIDevOpsAgentAccessPolicy'],
      },
    ]);

    const agentSpace = new devopsagent.CfnAgentSpace(this, 'DevOpsAgentSpace', {
      name: DEVOPS_AGENT_SPACE_NAME,
      operatorApp: {
        iam: {
          operatorAppRoleArn: operatorRole.roleArn,
        },
      },
    });
    const monitorAssociation = new devopsagent.CfnAssociation(this, 'MonitorAssociation', {
      agentSpaceId: agentSpace.attrAgentSpaceId,
      serviceId: 'aws',
      configuration: {
        aws: {
          accountId: account,
          accountType: 'monitor',
          assumableRoleArn: assumableRole.roleArn,
        },
      },
    });
    acknowledgeStaleRegionSchema(agentSpace);
    acknowledgeStaleRegionSchema(monitorAssociation);
  }
}

function acknowledgeStaleRegionSchema(resource: Construct): void {
  Validations.of(resource).acknowledge({
    id: 'CloudFormation-Validate::F3006',
    reason:
      'AWS documents the Security Agent and DevOps Agent in the workload region. The installed CloudFormation schema does not list those resource types there yet.',
  });
}
