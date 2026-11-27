import { Duration, RemovalPolicy, SecretValue, Validations } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { ENVS_SECRET_NAME } from './EnvsSecret.ts';

/** JSON key in the us-east-2 `envs` secret. CloudFormation resolves it in this stack's region. */
export const GROK_BOT_ALARM_WEBHOOK_TOKEN_KEY = 'GROK_BOT_ALARM_WEBHOOK_TOKEN';

const INVOCATION_RATE_PER_SECOND = 1;
const RETRY_ATTEMPTS = 185;
const MAX_EVENT_AGE = Duration.hours(24);

type GrokBotAlarmForwardingProps = {
  readonly webhookUrl: string;
};

/**
 * Forwards CloudWatch ALARM events in this region to the Grok Bot ops webhook.
 * The bearer token is a Secrets Manager dynamic reference, not a synth-time value.
 */
export class GrokBotAlarmForwarding extends Construct {
  public readonly rule: events.Rule;
  public readonly deadLetterQueue: Queue;

  constructor(scope: Construct, id: string, props: GrokBotAlarmForwardingProps) {
    super(scope, id);

    // A plain string so CloudFormation resolves the dynamic reference in place.
    // Fn::Join does not resolve secretsmanager references nested inside it.
    const bearerToken = SecretValue.unsafePlainText(
      `Bearer {{resolve:secretsmanager:${ENVS_SECRET_NAME}:SecretString:${GROK_BOT_ALARM_WEBHOOK_TOKEN_KEY}::}}`,
    );

    const connection = new events.Connection(this, 'Connection', {
      connectionName: 'GrokBotAlarmWebhook',
      description:
        'Bearer token for the Grok Bot alarm webhook. The token is resolved from the envs secret at deploy time.',
      authorization: events.Authorization.apiKey('Authorization', bearerToken),
    });

    const apiDestination = new events.ApiDestination(this, 'Destination', {
      apiDestinationName: 'GrokBotAlarmWebhook',
      description: 'POST CloudWatch alarm events to the Grok Bot ops webhook.',
      connection,
      endpoint: props.webhookUrl,
      httpMethod: events.HttpMethod.POST,
      rateLimitPerSecond: INVOCATION_RATE_PER_SECOND,
    });

    this.deadLetterQueue = new Queue(this, 'DeadLetterQueue', {
      queueName: 'GrokBotAlarmForwardingDlq',
      encryption: QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      retentionPeriod: Duration.days(14),
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.rule = new events.Rule(this, 'AlarmRule', {
      ruleName: 'GrokBotAlarmStateChange',
      description: 'Post CloudWatch ALARM state changes to the Grok Bot ops webhook.',
      eventPattern: {
        source: ['aws.cloudwatch'],
        detailType: ['CloudWatch Alarm State Change'],
        detail: {
          state: {
            value: ['ALARM'],
          },
        },
      },
      targets: [
        new targets.ApiDestination(apiDestination, {
          deadLetterQueue: this.deadLetterQueue,
          retryAttempts: RETRY_ATTEMPTS,
          maxEventAge: MAX_EVENT_AGE,
        }),
      ],
    });

    // cdk-nag only treats a queue as a DLQ when another SQS queue redrives to it.
    const dlqReason =
      'GrokBotAlarmForwardingDlq is the dead-letter queue for the EventBridge API destination target. Failed alarm posts land here after retries. It is not a source queue, so it has no redrive policy of its own.';
    Validations.of(this.deadLetterQueue).acknowledge(
      {
        id: 'AwsSolutions-SQS3',
        reason: dlqReason,
      },
      {
        id: 'Serverless-SQSRedrivePolicy',
        reason: dlqReason,
      },
    );
  }
}
