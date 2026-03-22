// oxlint-disable max-statements
import { Stack } from 'aws-cdk-lib';
import type { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Certificate, DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  CfnDistribution,
  Distribution,
  HttpVersion,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { RestApiOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import type { IFunctionUrl } from 'aws-cdk-lib/aws-lambda';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import type { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

// const cspAllowedSources = [
//   'https://login.microsoftonline.com',
//   'https://graph.microsoft.com', // to fetch user profile photo
// ];

// const domainName = '*.cloudfront.net';

type DistributionProps = {
  appStage: string;
  webappServerFunctionUrl: IFunctionUrl;
  webappServerApi: RestApi;
  assetsBucket: Bucket;
  originBehaviorKind: 'apiGw' | 'functionUrl';
};
export class WebappDistribution extends Construct {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: DistributionProps) {
    super(scope, id);

    const { appStage, webappServerApi, assetsBucket, originBehaviorKind } = props;

    const domainName = 'tanstack-aws-examples.com';
    const isProd = appStage === 'prod';
    const hasCloudFrontFreePlane = appStage === 'prod' || appStage === 'main';

    // Set up domain configuration for prod stage.
    let domainConfig: { domainNames: string[]; certificate: Certificate } | undefined;
    if (isProd) {
      const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
        domainName,
      });

      // const certificate = new Certificate(this, 'Certificate', {
      //   domainName,
      //   validation: CertificateValidation.fromDns(hostedZone),
      // });

      const certificate = new DnsValidatedCertificate(this, 'Cert', {
        domainName: domainName,
        hostedZone,
        transparencyLoggingEnabled: true,
        cleanupRoute53Records: true,
        // For CloudFront the certificate must places in us-east-1
        region: 'us-east-1',
      });

      domainConfig = {
        domainNames: [domainName],
        certificate,
      };
    }

    // const versionArnReader = new SSMParameterReader(this, 'LambdaEdgeVersionArn', {
    //   parameterName: '/lambda-edge/sigv4-signer/version-arn',
    //   region: 'us-east-1', // Always us-east-1 for Lambda@Edge
    // });

    // const versionArn = versionArnReader.getParameterValue();
    // const sigv4SignerEdgeFunction = Version.fromVersionArn(
    //   this,
    //   'SigV4SignerEdgeFunction',
    //   versionArn,
    // );

    const s3BucketOrigin = S3BucketOrigin.withOriginAccessControl(assetsBucket);

    // @see https://securityheaders.com
    // @see https://observatory.mozilla.org
    // const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'ResponseHeaderPolicy', {
    //   customHeadersBehavior: {
    //     customHeaders: [
    //       {
    //         header: 'Permissions-Policy',
    //         override: true,
    //         value: 'geolocation=(self), microphone=(), camera=(), fullscreen=(self), payment=()',
    //       },
    //     ],
    //   },
    //   securityHeadersBehavior: {
    //     contentSecurityPolicy: {
    //       contentSecurityPolicy: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${cspAllowedSources.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: blob:https://${domainName}/; font-src 'self'; connect-src 'self' ${cspAllowedSources.join(' ')}; frame-src 'self';`,
    //       override: true,
    //     },
    //     contentTypeOptions: { override: true },
    //     frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
    //     referrerPolicy: {
    //       override: true,
    //       referrerPolicy: HeadersReferrerPolicy.NO_REFERRER,
    //     },
    //     strictTransportSecurity: {
    //       // oxlint-disable-next-line no-magic-numbers
    //       accessControlMaxAge: Duration.days(200),
    //       includeSubdomains: true,
    //       override: true,
    //       preload: true,
    //     },
    //     xssProtection: { modeBlock: true, override: true, protection: true },
    //   },
    // });

    if (originBehaviorKind !== 'apiGw' && originBehaviorKind !== 'functionUrl') {
      throw new Error(`Invalid originBehaviorKind: ${originBehaviorKind}`);
    }

    const defaultBehavior = {
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      // Disable compression to enable streaming responses (SSE, async generators)
      // CloudFront buffers the entire response when compression is enabled
      compress: false,
      origin: new RestApiOrigin(webappServerApi),
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };
    // const defaultBehavior =
    //   // oxlint-disable-next-line no-ternary
    //   originBehaviorKind === 'apiGw'
    //     ? {
    //         allowedMethods: AllowedMethods.ALLOW_ALL,
    //         cachePolicy: CachePolicy.CACHING_DISABLED,
    //         origin: new RestApiOrigin(webappServerApi),
    //         originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    //         responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
    //         viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //       }
    //     : {
    //         allowedMethods: AllowedMethods.ALLOW_ALL,
    //         cachePolicy: CachePolicy.CACHING_DISABLED,
    //         edgeLambdas: [
    //           {
    //             eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
    //             functionVersion: sigv4SignerEdgeFunction,
    //             includeBody: true,
    //           },
    //         ],
    //         origin: FunctionUrlOrigin.withOriginAccessControl(webappServerFunctionUrl),
    //         originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    //         responseHeadersPolicy,
    //         viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //       };

    const staticAssetBehavior = {
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      origin: s3BucketOrigin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    this.distribution = new Distribution(this, 'Distribution', {
      additionalBehaviors: {
        '/assets/*': staticAssetBehavior,
        '/favicon.ico': staticAssetBehavior,
        '/images/*': staticAssetBehavior,
        // '/manifest.json': staticAssetBehavior,
        // '/robots.txt': staticAssetBehavior,
        // '/site.webmanifest': staticAssetBehavior,
      },
      comment: originBehaviorKind,
      defaultBehavior,
      ...(domainConfig && {
        domainNames: domainConfig.domainNames,
        certificate: domainConfig.certificate,
      }),
      httpVersion: HttpVersion.HTTP3,
    });

    if (hasCloudFrontFreePlane) {
      const cfnDistribution = this.distribution.node.defaultChild as CfnDistribution;
      const distributionLogicalId = Stack.of(this).getLogicalId(cfnDistribution);

      // Preserve the existing WebACL association in protected stages so updates
      // do not accidentally detach the pricing-plan-required WAF.
      const existingDistributionIdLookup = new AwsCustomResource(
        this,
        'ExistingDistributionIdLookup',
        {
          onUpdate: {
            service: 'CloudFormation',
            action: 'describeStackResource',
            parameters: {
              StackName: Stack.of(this).stackName,
              LogicalResourceId: distributionLogicalId,
            },
            // Keep custom resource response small and return only the
            // distribution id needed by the next lookup.
            outputPaths: ['StackResourceDetail.PhysicalResourceId'],
            physicalResourceId: PhysicalResourceId.of(
              `existing-distribution-id-${distributionLogicalId}-${Date.now().toString()}`,
            ),
          },
          policy: AwsCustomResourcePolicy.fromSdkCalls({
            resources: AwsCustomResourcePolicy.ANY_RESOURCE,
          }),
        },
      );

      const existingWebAclLookup = new AwsCustomResource(this, 'ExistingDistributionWebAclLookup', {
        onUpdate: {
          service: 'CloudFront',
          action: 'getDistribution',
          parameters: {
            Id: existingDistributionIdLookup.getResponseField(
              'StackResourceDetail.PhysicalResourceId',
            ),
          },
          // Avoid "Response object is too long" by returning only WebACLId.
          outputPaths: ['Distribution.DistributionConfig.WebACLId'],
          physicalResourceId: PhysicalResourceId.of(
            `existing-distribution-webacl-${distributionLogicalId}-${Date.now().toString()}`,
          ),
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({
          resources: AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });

      const resolvedProtectedStageWebAclId = existingWebAclLookup.getResponseField(
        'Distribution.DistributionConfig.WebACLId',
      );

      // For pricing-plan protected stages (main/prod), the WebACL is managed externally
      // from the AWS Console and must be preserved on every CDK update.
      // Fail fast when lookup cannot resolve the current value: never synthesize
      // protected-stage updates that omit DistributionConfig.WebACLId.
      cfnDistribution.addPropertyOverride(
        'DistributionConfig.WebACLId',
        resolvedProtectedStageWebAclId,
      );
    }

    // Create Route53 A record for prod stage.
    if (isProd && domainConfig) {
      const hostedZone = HostedZone.fromLookup(this, 'HostedZoneForRecord', {
        domainName,
      });

      new ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
      });
    }
  }
}
