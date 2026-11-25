import { ArnFormat, Aws, Stack, Validations } from 'aws-cdk-lib';
import * as devopsagent from 'aws-cdk-lib/aws-devopsagent';
import {
  CfnRole,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import * as securityagent from 'aws-cdk-lib/aws-securityagent';
import { Construct } from 'constructs';

const SECURITY_AGENT_SPACE_NAME = 'tanstack-aws-security';
const SECURITY_AGENT_SERVICE_PRINCIPAL = 'securityagent.amazonaws.com';
const SECURITY_AGENT_WEB_APP_POLICY = 'service-role/AWSSecurityAgentWebAppPolicy';
const IDENTITY_CENTER_CONTEXT_PROVIDER = 'arn:aws:iam::aws:contextProvider/IdentityCenter';
const DEVOPS_AGENT_SPACE_NAME = 'tanstack-aws-devops';
const DEVOPS_AGENT_SERVICE_PRINCIPAL = 'aidevops.amazonaws.com';
const DEVOPS_AGENT_ACCESS_POLICY = 'AIDevOpsAgentAccessPolicy';
const DEVOPS_OPERATOR_APP_ACCESS_POLICY = 'AIDevOpsOperatorAppAccessPolicy';

export type AgentSpacesProps = {
  readonly securityAgent: boolean;
  readonly devopsAgent: boolean;
};

/** Security Agent web application and agent space, plus the DevOps Agent space, in the workload region. */
export class AgentSpaces extends Construct {
  constructor(scope: Construct, id: string, props: AgentSpacesProps) {
    super(scope, id);

    if (props.securityAgent) {
      addSecurityAgent(this);
    }

    if (!props.devopsAgent) {
      return;
    }

    const stack = Stack.of(this);
    const { account } = stack;
    const operatorRole = new Role(this, 'OperatorRole', {
      assumedBy: new ServicePrincipal(DEVOPS_AGENT_SERVICE_PRINCIPAL),
      description: 'Role AWS DevOps Agent assumes for the operator web app.',
    });
    replaceAssumeRoleTrust(operatorRole, {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: DEVOPS_AGENT_SERVICE_PRINCIPAL },
          Action: ['sts:AssumeRole', 'sts:TagSession'],
          Condition: {
            StringEquals: {
              'aws:SourceAccount': account,
            },
            ArnLike: {
              'aws:SourceArn': stack.formatArn({
                service: 'aidevops',
                resource: 'agentspace/*',
                arnFormat: ArnFormat.NO_RESOURCE_NAME,
              }),
            },
          },
        },
      ],
    });
    operatorRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(DEVOPS_OPERATOR_APP_ACCESS_POLICY),
    );
    Validations.of(operatorRole).acknowledge({
      id: `AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/${DEVOPS_OPERATOR_APP_ACCESS_POLICY}]`,
      reason:
        'AWS DevOps Agent requires the AWS-managed AIDevOpsOperatorAppAccessPolicy so operator web app permissions stay current.',
    });
    const agentSpace = new devopsagent.CfnAgentSpace(this, 'DevOpsAgentSpace', {
      name: DEVOPS_AGENT_SPACE_NAME,
      operatorApp: {
        iam: {
          operatorAppRoleArn: operatorRole.roleArn,
        },
      },
    });
    const assumableRole = new Role(this, 'AssumableRole', {
      assumedBy: new ServicePrincipal(DEVOPS_AGENT_SERVICE_PRINCIPAL, {
        conditions: {
          StringEquals: {
            'aws:SourceAccount': account,
          },
          ArnEquals: {
            'aws:SourceArn': agentSpace.attrArn,
          },
        },
      }),
      description: 'Role AWS DevOps Agent assumes to monitor this account.',
    });
    assumableRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(DEVOPS_AGENT_ACCESS_POLICY),
    );
    Validations.of(assumableRole).acknowledge({
      id: `AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/AIDevOpsAgentAccessPolicy]`,
      reason:
        'AWS DevOps Agent requires the AWS-managed AIDevOpsAgentAccessPolicy so investigation permissions stay current as AWS adds resource types.',
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

function addSecurityAgent(scope: Construct): void {
  const stack = Stack.of(scope);
  const sourceArns = [
    stack.formatArn({
      service: 'securityagent',
      resource: 'application/*',
      arnFormat: ArnFormat.NO_RESOURCE_NAME,
    }),
    stack.formatArn({
      service: 'securityagent',
      resource: 'agent-space/*',
      arnFormat: ArnFormat.NO_RESOURCE_NAME,
    }),
  ];
  const applicationRole = new Role(scope, 'ApplicationRole', {
    assumedBy: new ServicePrincipal(SECURITY_AGENT_SERVICE_PRINCIPAL),
    description: 'Role AWS Security Agent assumes for the web application.',
  });
  replaceAssumeRoleTrust(applicationRole, {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowServiceAssumeRole',
        Effect: 'Allow',
        Principal: { Service: SECURITY_AGENT_SERVICE_PRINCIPAL },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: { 'aws:SourceAccount': stack.account },
          ArnLike: { 'aws:SourceArn': sourceArns },
        },
      },
      {
        Sid: 'AllowServiceSetContext',
        Effect: 'Allow',
        Principal: { Service: SECURITY_AGENT_SERVICE_PRINCIPAL },
        Action: 'sts:SetContext',
        Condition: {
          StringEquals: { 'aws:SourceAccount': stack.account },
          'ForAllValues:ArnEquals': {
            'sts:RequestContextProviders': IDENTITY_CENTER_CONTEXT_PROVIDER,
          },
          ArnLike: { 'aws:SourceArn': sourceArns },
        },
      },
    ],
  });
  applicationRole.addManagedPolicy(
    ManagedPolicy.fromAwsManagedPolicyName(SECURITY_AGENT_WEB_APP_POLICY),
  );
  const logsArn = `arn:${Aws.PARTITION}:logs:${stack.region}:${Aws.ACCOUNT_ID}:log-group:*:log-stream:*`;
  const secretsArn = `arn:${Aws.PARTITION}:secretsmanager:${stack.region}:${Aws.ACCOUNT_ID}:secret:*`;
  applicationRole.addToPolicy(
    new PolicyStatement({
      sid: 'CloudWatchLogsRead',
      actions: ['logs:GetLogEvents'],
      resources: [logsArn],
    }),
  );
  applicationRole.addToPolicy(
    new PolicyStatement({
      sid: 'SecretsManagerCreate',
      actions: ['secretsmanager:CreateSecret'],
      resources: [secretsArn],
    }),
  );
  Validations.of(applicationRole).acknowledge(
    {
      id: `AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/${SECURITY_AGENT_WEB_APP_POLICY}]`,
      reason:
        'AWS Security Agent requires the AWS-managed AWSSecurityAgentWebAppPolicy so web application API permissions stay current.',
    },
    {
      id: `AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:logs:${stack.region}:<AWS::AccountId>:log-group:*:log-stream:*]`,
      reason:
        'The Security Agent web application reads log events from log groups chosen later in the console. The account and region are fixed.',
    },
    {
      id: `AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:secretsmanager:${stack.region}:<AWS::AccountId>:secret:*]`,
      reason:
        'The Security Agent web application creates secrets whose names are assigned when a penetration test stores credentials.',
    },
  );

  const securityAgentSpace = new securityagent.CfnAgentSpace(scope, 'SecurityAgentSpace', {
    name: SECURITY_AGENT_SPACE_NAME,
  });
  const application = new securityagent.CfnApplication(scope, 'Application', {
    roleArn: applicationRole.roleArn,
  });
  const applicationPolicy = applicationRole.node.tryFindChild('DefaultPolicy');
  if (applicationPolicy) {
    application.node.addDependency(applicationPolicy);
  }
  acknowledgeStaleRegionSchema(securityAgentSpace);
  acknowledgeStaleRegionSchema(application);
}

type AssumeRoleConditionValue = string | string[];

type AssumeRoleTrustDocument = {
  Version: '2012-10-17';
  Statement: Array<{
    Sid?: string;
    Effect: 'Allow';
    Principal: { Service: string };
    Action: string | string[];
    Condition: Record<string, Record<string, AssumeRoleConditionValue>>;
  }>;
};

function replaceAssumeRoleTrust(
  role: Role,
  assumeRolePolicyDocument: AssumeRoleTrustDocument,
): void {
  const resource = role.node.defaultChild;
  if (!(resource instanceof CfnRole)) {
    throw new Error('Operator role is not an IAM role.');
  }
  resource.assumeRolePolicyDocument = assumeRolePolicyDocument;
}

function acknowledgeStaleRegionSchema(resource: Construct): void {
  Validations.of(resource).acknowledge({
    id: 'CloudFormation-Validate::F3006',
    reason:
      'AWS documents the Security Agent and DevOps Agent in the workload region. The installed CloudFormation schema does not list those resource types there yet.',
  });
}
