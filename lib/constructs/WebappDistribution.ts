// oxlint-disable max-statements
import type { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Certificate, DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HttpVersion,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { RestApiOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import type { IFunctionUrl } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import type { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

// Const cspAllowedSources = [
//   'https://login.microsoftonline.com',
//   'https://graph.microsoft.com', // to fetch user profile photo
// ];

// Const domainName = '*.cloudfront.net';

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
    const isProdStage = appStage === 'prod';
    // Const isProdStage = appStage === 'main';

    // Set up domain configuration for main stage
    let domainConfig: { domainNames: string[]; certificate: Certificate } | undefined;
    if (isProdStage) {
      const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
        domainName,
      });

      // Const certificate = new Certificate(this, 'Certificate', {
      //   DomainName,
      //   Validation: CertificateValidation.fromDns(hostedZone),
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

    // Const versionArnReader = new SSMParameterReader(this, 'LambdaEdgeVersionArn', {
    //   ParameterName: '/lambda-edge/sigv4-signer/version-arn',
    //   Region: 'us-east-1', // Always us-east-1 for Lambda@Edge
    // });

    // Const versionArn = versionArnReader.getParameterValue();
    // Const sigv4SignerEdgeFunction = Version.fromVersionArn(
    //   This,
    //   'SigV4SignerEdgeFunction',
    //   VersionArn,
    // );

    const s3BucketOrigin = S3BucketOrigin.withOriginAccessControl(assetsBucket);

    // @see https://securityheaders.com
    // @see https://observatory.mozilla.org
    // Const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'ResponseHeaderPolicy', {
    //   CustomHeadersBehavior: {
    //     CustomHeaders: [
    //       {
    //         Header: 'Permissions-Policy',
    //         Override: true,
    //         Value: 'geolocation=(self), microphone=(), camera=(), fullscreen=(self), payment=()',
    //       },
    //     ],
    //   },
    //   SecurityHeadersBehavior: {
    //     ContentSecurityPolicy: {
    //       ContentSecurityPolicy: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${cspAllowedSources.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: blob:https://${domainName}/; font-src 'self'; connect-src 'self' ${cspAllowedSources.join(' ')}; frame-src 'self';`,
    //       Override: true,
    //     },
    //     ContentTypeOptions: { override: true },
    //     FrameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
    //     ReferrerPolicy: {
    //       Override: true,
    //       ReferrerPolicy: HeadersReferrerPolicy.NO_REFERRER,
    //     },
    //     StrictTransportSecurity: {
    //       // oxlint-disable-next-line no-magic-numbers
    //       AccessControlMaxAge: Duration.days(200),
    //       IncludeSubdomains: true,
    //       Override: true,
    //       Preload: true,
    //     },
    //     XssProtection: { modeBlock: true, override: true, protection: true },
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
    // Const defaultBehavior =
    //   // oxlint-disable-next-line no-ternary
    //   OriginBehaviorKind === 'apiGw'
    //     ? {
    //         AllowedMethods: AllowedMethods.ALLOW_ALL,
    //         CachePolicy: CachePolicy.CACHING_DISABLED,
    //         Origin: new RestApiOrigin(webappServerApi),
    //         OriginRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    //         ResponseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
    //         ViewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //       }
    //     : {
    //         AllowedMethods: AllowedMethods.ALLOW_ALL,
    //         CachePolicy: CachePolicy.CACHING_DISABLED,
    //         EdgeLambdas: [
    //           {
    //             EventType: LambdaEdgeEventType.ORIGIN_REQUEST,
    //             FunctionVersion: sigv4SignerEdgeFunction,
    //             IncludeBody: true,
    //           },
    //         ],
    //         Origin: FunctionUrlOrigin.withOriginAccessControl(webappServerFunctionUrl),
    //         OriginRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    //         ResponseHeadersPolicy,
    //         ViewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //       };

    const staticAssetBehavior = {
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      origin: s3BucketOrigin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    this.distribution = new Distribution(this, 'Distribution', {
      additionalBehaviors: {
        '/ads.txt': staticAssetBehavior,
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

    // Create Route53 A record for main stage
    if (isProdStage && domainConfig) {
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
