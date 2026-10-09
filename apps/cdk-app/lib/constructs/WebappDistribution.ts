// oxlint-disable max-statements
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
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { preserveProtectedStageWebAcl } from './ProtectedStageWebAcl.ts';

// const cspAllowedSources = [
//   'https://login.microsoftonline.com',
//   'https://graph.microsoft.com', // to fetch user profile photo
// ];

// const domainName = '*.cloudfront.net';

// main/prod distributions use CloudFront's Free pricing plan, which allows at most
// five additional cache behaviors (excluding the default SSR behavior).
const CLOUDFRONT_FREE_PLAN_MAX_CACHE_BEHAVIORS = 5;

type DistributionProps = {
  appStage: string;
  /** Human-readable label shown as the CloudFront distribution description in the AWS console. */
  description: string;
  webappServerFunctionUrl: IFunctionUrl;
  webappServerApi: RestApi;
  assetsBucket: Bucket;
  originBehaviorKind: 'apiGw' | 'functionUrl';
  customHostname?: string;
};
export class WebappDistribution extends Construct {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: DistributionProps) {
    super(scope, id);

    const {
      appStage,
      description,
      webappServerApi,
      assetsBucket,
      originBehaviorKind,
      customHostname,
    } = props;

    const baseDomain = 'tanstack-aws-examples.com';
    const isProd = appStage === 'prod';
    const hasCloudFrontFreePlane = appStage === 'prod' || appStage === 'main';
    const distributionDomainName = customHostname ?? baseDomain;

    // Set up domain configuration for prod stage.
    let domainConfig: { domainNames: string[]; certificate: Certificate } | undefined;
    if (isProd) {
      const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
        domainName: baseDomain,
      });

      // const certificate = new Certificate(this, 'Certificate', {
      //   domainName,
      //   validation: CertificateValidation.fromDns(hostedZone),
      // });

      const certificate = new DnsValidatedCertificate(this, 'Cert', {
        domainName: distributionDomainName,
        hostedZone,
        transparencyLoggingEnabled: true,
        cleanupRoute53Records: true,
        // For CloudFront the certificate must places in us-east-1
        region: 'us-east-1',
      });
      NagSuppressions.addResourceSuppressions(
        certificate,
        [
          {
            id: 'AwsSolutions-L1',
            reason:
              'DnsValidatedCertificate requestor Lambda is framework-managed by aws-cdk-lib and updated through CDK upgrades.',
          },
          {
            id: 'Serverless-LambdaDefaultMemorySize',
            reason:
              'Certificate requestor runs briefly during provisioning; framework default memory is sufficient.',
          },
          {
            id: 'Serverless-LambdaDLQ',
            reason:
              'CloudFormation deployment events capture custom resource failures and retries for certificate provisioning.',
          },
          {
            id: 'Serverless-LambdaLatestVersion',
            reason:
              'Certificate requestor runtime lifecycle is owned by aws-cdk-lib internals, not application code.',
          },
          {
            id: 'Serverless-LambdaTracing',
            reason:
              'Certificate requestor executes only during deploy-time certificate orchestration; active tracing is optional.',
          },
          {
            id: 'AwsSolutions-IAM4',
            reason:
              'Certificate requestor role uses AWSLambdaBasicExecutionRole as part of CDK-managed custom resource implementation.',
            appliesTo: [
              'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
            ],
          },
          {
            id: 'AwsSolutions-IAM5',
            reason:
              'Certificate DNS validation provider requires wildcard-scoped permissions because Route53 and ACM operations are resolved dynamically.',
            appliesTo: ['Resource::*'],
          },
        ],
        true,
      );

      domainConfig = {
        domainNames: [distributionDomainName],
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

    // Build output and synced public/ files both live under /assets/* in S3.
    // scripts/sync-public-assets.ts merges public/assets/ after each Vite build.
    // Root files like manifest.json and robots.txt are served by Start routes.
    // Paths that miss /assets/* fall through to the SSR API.
    const staticAssetCacheBehaviors = {
      '/assets/*': staticAssetBehavior,
    };

    if (
      hasCloudFrontFreePlane &&
      Object.keys(staticAssetCacheBehaviors).length > CLOUDFRONT_FREE_PLAN_MAX_CACHE_BEHAVIORS
    ) {
      throw new Error(
        `Protected stage "${appStage}" exceeds CloudFront Free plan limit of ${CLOUDFRONT_FREE_PLAN_MAX_CACHE_BEHAVIORS.toString()} cache behaviors. Serve additional static paths through SSR routes instead.`,
      );
    }

    this.distribution = new Distribution(this, 'Distribution', {
      additionalBehaviors: staticAssetCacheBehaviors,
      comment: description,
      defaultBehavior,
      ...(domainConfig && {
        domainNames: domainConfig.domainNames,
        certificate: domainConfig.certificate,
      }),
      httpVersion: HttpVersion.HTTP3,
    });

    NagSuppressions.addResourceSuppressions(this.distribution, [
      {
        id: 'AwsSolutions-CFR1',
        reason: 'Geo restrictions not required for demo.',
      },
      {
        id: 'AwsSolutions-CFR2',
        reason: 'main/prod use external WebACL; WAF applied at CloudFront level.',
      },
      {
        id: 'AwsSolutions-CFR3',
        reason: 'Access logging optional for demo; main/prod use external WAF.',
      },
      {
        id: 'AwsSolutions-CFR4',
        reason:
          'Dev uses default CloudFront cert; prod uses ACM with TLS 1.2. Default cert cannot enforce minimum protocol.',
      },
    ]);

    if (hasCloudFrontFreePlane) {
      const cfnDistribution = this.distribution.node.defaultChild;
      if (!(cfnDistribution instanceof CfnDistribution)) {
        throw new Error('Expected the CloudFront distribution L1 resource.');
      }

      // Protected stages keep the console-managed WebACL. A distribution that is
      // not in the stack yet copies the WebACL from one that already is.
      preserveProtectedStageWebAcl(this, cfnDistribution);
    }

    // Create Route53 A record for prod stage.
    if (isProd && domainConfig) {
      const hostedZone = HostedZone.fromLookup(this, 'HostedZoneForRecord', {
        domainName: baseDomain,
      });

      const recordName =
        distributionDomainName === baseDomain
          ? undefined
          : distributionDomainName.slice(0, -(baseDomain.length + 1));

      new ARecord(this, 'AliasRecord', {
        ...(recordName && { recordName }),
        zone: hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
      });
    }
  }
}
