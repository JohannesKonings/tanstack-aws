import {
  CloudFormationClient,
  ListStackResourcesCommand,
  type StackResourceSummary,
} from '@aws-sdk/client-cloudformation';
import { CloudFrontClient, GetDistributionCommand } from '@aws-sdk/client-cloudfront';
import type { CloudFormationCustomResourceEvent } from 'aws-lambda';

const cloudFormation = new CloudFormationClient({});
const cloudFront = new CloudFrontClient({ region: 'us-east-1' });

type DistributionRef = {
  logicalId: string;
  physicalId: string;
};

type LookupResult = {
  Data?: { WebACLId: string };
  PhysicalResourceId: string;
};

const readProperty = (
  properties: CloudFormationCustomResourceEvent['ResourceProperties'],
  key: string,
): string => {
  const value = properties[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing ${key} for the distribution WebACL lookup.`);
  }
  return value;
};

export const selectDistributionPhysicalId = (
  ownLogicalId: string,
  distributions: readonly DistributionRef[],
): string => {
  const ownDistribution = distributions.find(
    (distribution) => distribution.logicalId === ownLogicalId,
  );
  if (ownDistribution) {
    return ownDistribution.physicalId;
  }

  const existingDistribution = distributions.find(
    (distribution) => distribution.logicalId !== ownLogicalId,
  );
  if (!existingDistribution) {
    throw new Error(
      `CloudFront distribution ${ownLogicalId} is not in the stack yet, and no existing distribution is available to copy a WebACL from.`,
    );
  }

  return existingDistribution.physicalId;
};

export const requireWebAclId = (distributionId: string, webAclId: string | undefined): string => {
  if (!webAclId) {
    throw new Error(
      `CloudFront distribution ${distributionId} has no WebACL. Protected stages must keep the existing WebACL association.`,
    );
  }
  return webAclId;
};

const toDistributionRef = (resource: StackResourceSummary): DistributionRef | undefined => {
  if (resource.ResourceType !== 'AWS::CloudFront::Distribution') {
    return undefined;
  }
  if (!resource.LogicalResourceId || !resource.PhysicalResourceId) {
    return undefined;
  }
  return { logicalId: resource.LogicalResourceId, physicalId: resource.PhysicalResourceId };
};

const listDistributionPage = async (
  stackName: string,
  nextToken: string | undefined,
): Promise<DistributionRef[]> => {
  const page = await cloudFormation.send(
    new ListStackResourcesCommand({ NextToken: nextToken, StackName: stackName }),
  );
  const distributions = (page.StackResourceSummaries ?? []).flatMap((resource) => {
    const distribution = toDistributionRef(resource);
    return distribution ? [distribution] : [];
  });
  if (!page.NextToken) {
    return distributions;
  }
  const remaining = await listDistributionPage(stackName, page.NextToken);
  return [...distributions, ...remaining];
};

const listDistributions = async (stackName: string): Promise<DistributionRef[]> => {
  return listDistributionPage(stackName, undefined);
};

const readWebAclId = async (distributionId: string): Promise<string> => {
  const distribution = await cloudFront.send(new GetDistributionCommand({ Id: distributionId }));
  return requireWebAclId(distributionId, distribution.Distribution?.DistributionConfig?.WebACLId);
};

const lookupWebAclId = async (stackName: string, logicalResourceId: string): Promise<string> => {
  const distributions = await listDistributions(stackName);
  const distributionId = selectDistributionPhysicalId(logicalResourceId, distributions);
  return readWebAclId(distributionId);
};

export const handler = async (event: CloudFormationCustomResourceEvent): Promise<LookupResult> => {
  const logicalResourceId = readProperty(event.ResourceProperties, 'LogicalResourceId');
  if (event.RequestType === 'Delete') {
    return { PhysicalResourceId: event.PhysicalResourceId || logicalResourceId };
  }

  const stackName = readProperty(event.ResourceProperties, 'StackName');
  const physicalResourceId =
    event.RequestType === 'Create' ? logicalResourceId : event.PhysicalResourceId;
  return {
    Data: { WebACLId: await lookupWebAclId(stackName, logicalResourceId) },
    PhysicalResourceId: physicalResourceId,
  };
};
