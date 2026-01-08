import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { type CfnMethod, Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

const LAMBDA_TIMEOUT_MINUTES = 15;
const MEMORY_SIZE_MB = 256;

interface SseApiProps {
  /** The Events table to query for change events */
  eventsTable: Table;
}

/**
 * Create the SSE streaming Lambda function
 */
const createSseHandler = (scope: Construct, eventsTableName: string): NodejsFunction =>
  new NodejsFunction(scope, 'SseHandler', {
    entry: 'src/lambda/sse-stream.ts',
    runtime: Runtime.NODEJS_22_X,
    handler: 'streamingHandler',
    environment: {
      EVENTS_TABLE: eventsTableName,
    },
    timeout: Duration.minutes(LAMBDA_TIMEOUT_MINUTES),
    memorySize: MEMORY_SIZE_MB,
    bundling: {
      minify: true,
      sourceMap: true,
      externalModules: ['@aws-sdk/*'],
    },
  });

/**
 * Create the REST API with CORS configured
 */
const createRestApi = (scope: Construct): RestApi =>
  new RestApi(scope, 'PersonsSseApi', {
    restApiName: 'Persons SSE API',
    description: 'Real-time sync via Server-Sent Events',
    defaultCorsPreflightOptions: {
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Last-Event-ID'],
    },
  });

/**
 * Configure the streaming endpoint with response streaming
 */
const configureStreamingEndpoint = (
  scope: Construct,
  api: RestApi,
  sseHandler: NodejsFunction,
): void => {
  const eventsResource = api.root.addResource('events');
  const streamResource = eventsResource.addResource('stream');

  const integration = new LambdaIntegration(sseHandler, {
    proxy: true,
  });

  const method = streamResource.addMethod('GET', integration);

  // Apply streaming configuration via escape hatch
  const cfnMethod = method.node.defaultChild as CfnMethod;
  cfnMethod.addPropertyOverride('Integration.ResponseTransferMode', 'STREAM');

  // Use streaming invocation URI
  const { region } = Stack.of(scope);
  cfnMethod.addPropertyOverride(
    'Integration.Uri',
    `arn:aws:apigateway:${region}:lambda:path/2021-11-15/functions/${sseHandler.functionArn}/response-streaming-invocations`,
  );
};

/**
 * SSE (Server-Sent Events) API
 *
 * Creates an API Gateway REST API with response streaming enabled,
 * backed by a Lambda that streams entity change events to clients.
 *
 * Features:
 * - Response streaming for real-time updates
 * - SSE format for native browser EventSource support
 * - Reconnection support via Last-Event-ID header
 * - 15-minute streaming sessions with auto-reconnect hints
 *
 * @see docs/PLAN-DB-PERSONS.md Section 15B for architecture details
 */
export class SseApi extends Construct {
  public readonly api: RestApi;
  public readonly sseEndpoint: string;

  constructor(scope: Construct, id: string, props: SseApiProps) {
    super(scope, id);

    const sseHandler = createSseHandler(this, props.eventsTable.tableName);
    props.eventsTable.grantReadData(sseHandler);

    this.api = createRestApi(this);
    configureStreamingEndpoint(this, this.api, sseHandler);

    this.sseEndpoint = `${this.api.url}events/stream`;

    new CfnOutput(this, 'SseEndpointUrl', {
      value: this.sseEndpoint,
      description: 'SSE Endpoint URL for real-time sync',
      exportName: 'PersonsSseEndpoint',
    });
  }
}
