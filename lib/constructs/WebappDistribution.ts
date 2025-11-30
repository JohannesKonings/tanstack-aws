import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  LambdaEdgeEventType,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { FunctionUrlOrigin, HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { SSMParameterReader } from './SSMParameterReader.ts';
import { Version, type IFunctionUrl } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import type { Bucket } from 'aws-cdk-lib/aws-s3';

const cspAllowedSources = [
  'https://login.microsoftonline.com',
  'https://graph.microsoft.com', // to fetch user profile photo
];

const domainName = '*.cloudfront.net';

type DistributionProps = {
  webappServerFunctionUrl: IFunctionUrl;
  assetsBucket: Bucket;
};
export class WebappDistribution extends Construct {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: DistributionProps) {
    super(scope, id);

    const { webappServerFunctionUrl, assetsBucket } = props;

    const versionArnReader = new SSMParameterReader(this, 'LambdaEdgeVersionArn', {
      parameterName: '/lambda-edge/sigv4-signer/version-arn',
      region: 'us-east-1', // Always us-east-1 for Lambda@Edge
    });

    const versionArn = versionArnReader.getParameterValue();
    const sigv4SignerEdgeFunction = Version.fromVersionArn(
      this,
      'SigV4SignerEdgeFunction',
      versionArn,
    );

    const s3BucketOrigin = S3BucketOrigin.withOriginAccessControl(assetsBucket);

    // @see https://securityheaders.com
    // @see https://observatory.mozilla.org
    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'ResponseHeaderPolicy', {
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            override: true,
            value: 'geolocation=(self), microphone=(), camera=(), fullscreen=(self), payment=()',
          },
        ],
      },
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${cspAllowedSources.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: blob:https://${domainName}/; font-src 'self'; connect-src 'self' ${cspAllowedSources.join(' ')}; frame-src 'self';`,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          override: true,
          referrerPolicy: HeadersReferrerPolicy.NO_REFERRER,
        },
        strictTransportSecurity: {
          // oxlint-disable-next-line no-magic-numbers
          accessControlMaxAge: Duration.days(200),
          includeSubdomains: true,
          override: true,
          preload: true,
        },
        xssProtection: { modeBlock: true, override: true, protection: true },
      },
    });

    this.distribution = new Distribution(this, 'Distribution', {
      additionalBehaviors: {
        '/*.ico': {
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          origin: s3BucketOrigin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        '/*.png': {
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          origin: s3BucketOrigin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        '/_build/*': {
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          origin: s3BucketOrigin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        '/assets/*': {
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          origin: s3BucketOrigin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        '/site.webmanifest': {
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          origin: s3BucketOrigin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      defaultBehavior: {
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        edgeLambdas: [
          {
            eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
            functionVersion: sigv4SignerEdgeFunction,
            includeBody: true,
          },
        ],
        origin: FunctionUrlOrigin.withOriginAccessControl(webappServerFunctionUrl),
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        responseHeadersPolicy,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });
  }
}
