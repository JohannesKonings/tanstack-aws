// oxlint-disable max-statements
import type { RestApi } from 'aws-cdk-lib/aws-apigateway';
import type { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cloudfrontMixins from '@aws-cdk/mixins-preview/aws-cloudfront/mixins';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  Certificate,
  CertificateValidation,
  DnsValidatedCertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  HttpVersion,
  LambdaEdgeEventType,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import {
  FunctionUrlOrigin,
  HttpOrigin,
  RestApiOrigin,
  S3BucketOrigin,
} from 'aws-cdk-lib/aws-cloudfront-origins';
import { type IFunctionUrl, Version } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import '@aws-cdk/mixins-preview/with';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
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

    const { appStage, webappServerFunctionUrl, webappServerApi, assetsBucket, originBehaviorKind } =
      props;

    const domainName = 'tanstack-aws-examples.com';
    const isProdStage = appStage === 'prod';
    // const isProdStage = appStage === 'main';

    // Set up domain configuration for main stage
    let domainConfig: { domainNames: string[]; certificate: Certificate } | undefined;
    if (isProdStage) {
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
