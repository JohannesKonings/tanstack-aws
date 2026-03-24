import { Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

const LAMBDA_TIMEOUT_SECONDS = 30;
const BATCH_WINDOW_SECONDS = 1;
const BATCH_SIZE = 100;
const RETRY_ATTEMPTS = 3;
const MEMORY_SIZE_MB = 256;
const FORCE_DOCKER_BUNDLING_IN_CI = process.env.CI === 'true';

interface StreamToEventsProcessorProps {
  /** The Persons table with DynamoDB Streams enabled */
  personsTable: Table;
  /** The Events table to write change events to */
  eventsTable: Table;
}

/**
 * Stream-to-Events Processor
 *
 * Lambda triggered by DynamoDB Streams that writes entity change events
 * to the Events table. SSE clients query the Events table independently.
 *
 * @see docs/PLAN-DB-PERSONS.md Section 15B for architecture details
 */
export class StreamToEventsProcessor extends Construct {
  public readonly processor: NodejsFunction;

  constructor(scope: Construct, id: string, props: StreamToEventsProcessorProps) {
    super(scope, id);

    this.processor = new NodejsFunction(this, 'Processor', {
      entry: 'src/lambda/stream-to-events.ts',
      runtime: Runtime.NODEJS_24_X,
      handler: 'handler',
      environment: {
        EVENTS_TABLE: props.eventsTable.tableName,
      },
      timeout: Duration.seconds(LAMBDA_TIMEOUT_SECONDS),
      memorySize: MEMORY_SIZE_MB,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: FORCE_DOCKER_BUNDLING_IN_CI,
      },
      reservedConcurrentExecutions: 10,
    });

    // Grant write access to Events table
    props.eventsTable.grantWriteData(this.processor);

    // Trigger from DynamoDB Stream
    this.processor.addEventSource(
      new DynamoEventSource(props.personsTable, {
        startingPosition: StartingPosition.LATEST,
        batchSize: BATCH_SIZE,
        maxBatchingWindow: Duration.seconds(BATCH_WINDOW_SECONDS),
        retryAttempts: RETRY_ATTEMPTS,
        bisectBatchOnError: true, // Split batch on error for better fault tolerance
      }),
    );

    NagSuppressions.addResourceSuppressions(
      this.processor,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'Lambda uses AWS managed policies; replacing with custom policies adds operational overhead for marginal security gain.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'DynamoDB stream and grants use table/index ARN patterns; scoping not practical.',
        },
        {
          id: 'Serverless-LambdaDLQ',
          reason: 'DLQ adds cost; DynamoDB Streams has built-in retry and batch bisect.',
        },
        {
          id: 'Serverless-LambdaLatestVersion',
          reason: 'NODEJS_22_X is supported; 24 adoption in progress.',
        },
        {
          id: 'Serverless-LambdaTracing',
          reason: 'X-Ray optional for stream processor; cost vs value trade-off.',
        },
        {
          id: 'Serverless-LambdaEventSourceMappingDestination',
          reason: 'DynamoDB Streams has retry/bisect; DLQ adds operational overhead.',
        },
      ],
      true,
    );
  }
}
