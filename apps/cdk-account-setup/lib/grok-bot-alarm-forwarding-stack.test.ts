import { Match, Template } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, ServerlessChecks } from 'cdk-nag';
import { describe, expect, it } from 'vite-plus/test';
import { snapshotSafeTemplate } from '../../../tooling/cdk-snapshot.ts';
import { resolveGrokBotAlarmWebhookUrl } from './app-config.ts';
import { createAccountSetupApp } from './cdk-app.ts';
import { GrokBotAlarmForwardingStack } from './grok-bot-alarm-forwarding-stack.ts';

const WEBHOOK_URL = 'https://example.com/grok-bot-alarms';

function alarmStack(webhookUrl?: string): GrokBotAlarmForwardingStack {
  const app = createAccountSetupApp();
  if (webhookUrl !== undefined) {
    app.node.setContext('grokBotAlarmWebhookUrl', webhookUrl);
  }
  return new GrokBotAlarmForwardingStack(app, 'GrokBotAlarmForwardingStack', {
    env: {
      account: '123456789012',
      region: 'us-east-2',
    },
  });
}

describe('resolveGrokBotAlarmWebhookUrl', () => {
  it('throws when the webhook URL is missing', () => {
    expect(() => resolveGrokBotAlarmWebhookUrl({})).toThrow(
      'Missing CDK context grokBotAlarmWebhookUrl. Pass -c grokBotAlarmWebhookUrl=<https url>. The Account Setup workflow reads GROK_BOT_ALARM_WEBHOOK_URL from the envs secret in us-east-2.',
    );
  });

  it('uses CDK context when the stack prop is omitted', () => {
    expect(resolveGrokBotAlarmWebhookUrl({ context: WEBHOOK_URL })).toBe(WEBHOOK_URL);
  });

  it('lets the stack prop override context', () => {
    expect(
      resolveGrokBotAlarmWebhookUrl({
        prop: 'https://example.com/override',
        context: WEBHOOK_URL,
      }),
    ).toBe('https://example.com/override');
  });

  it('rejects a non-https URL, whitespace, and a non-string', () => {
    expect(() => resolveGrokBotAlarmWebhookUrl({ prop: 'http://example.com/hook' })).toThrow(
      'grokBotAlarmWebhookUrl must be an https URL with no whitespace. Received "http://example.com/hook".',
    );
    expect(() => resolveGrokBotAlarmWebhookUrl({ context: 'https://example.com/a b' })).toThrow(
      /https URL/,
    );
    expect(() => resolveGrokBotAlarmWebhookUrl({ context: 1 })).toThrow(
      'CDK context grokBotAlarmWebhookUrl must be a string. Received number.',
    );
  });
});

describe('GrokBotAlarmForwardingStack', () => {
  it('forwards CloudWatch ALARM events to the webhook with a bearer token reference', () => {
    const stack = alarmStack(WEBHOOK_URL);
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Events::Rule', {
      Name: 'GrokBotAlarmStateChange',
      EventPattern: {
        source: ['aws.cloudwatch'],
        'detail-type': ['CloudWatch Alarm State Change'],
        detail: {
          state: {
            value: ['ALARM'],
          },
        },
      },
      Targets: [
        Match.objectLike({
          Arn: Match.anyValue(),
          Input: Match.absent(),
          DeadLetterConfig: {
            Arn: Match.anyValue(),
          },
          RetryPolicy: {
            MaximumRetryAttempts: 185,
            MaximumEventAgeInSeconds: 86400,
          },
        }),
      ],
    });

    template.hasResourceProperties('AWS::Events::ApiDestination', {
      Name: 'GrokBotAlarmWebhook',
      HttpMethod: 'POST',
      InvocationEndpoint: WEBHOOK_URL,
      InvocationRateLimitPerSecond: 1,
    });

    template.hasResourceProperties('AWS::Events::Connection', {
      Name: 'GrokBotAlarmWebhook',
      AuthorizationType: 'API_KEY',
      AuthParameters: {
        ApiKeyAuthParameters: {
          ApiKeyName: 'Authorization',
          ApiKeyValue:
            'Bearer {{resolve:secretsmanager:envs:SecretString:GROK_BOT_ALARM_WEBHOOK_TOKEN::}}',
        },
      },
    });

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'GrokBotAlarmForwardingDlq',
      SqsManagedSseEnabled: true,
      MessageRetentionPeriod: 1209600,
    });

    const templateJson = template.toJSON();
    const resourcesJson = JSON.stringify(templateJson.Resources);
    expect(resourcesJson).toContain('aws:SecureTransport');
    expect(resourcesJson).not.toContain('GROK_BOT_ALARM_WEBHOOK_TOKEN_VALUE');
    expect(templateJson.Outputs).toHaveProperty('GrokBotAlarmRuleArn');
    expect(templateJson.Outputs).toHaveProperty('GrokBotAlarmDlqArn');
    expect(snapshotSafeTemplate(templateJson)).toMatchSnapshot();
  });

  it('fails when the webhook URL is missing', () => {
    expect(() => alarmStack()).toThrow(/Missing CDK context grokBotAlarmWebhookUrl/);
  });

  it('lets the stack prop override context', () => {
    const app = createAccountSetupApp();
    app.node.setContext('grokBotAlarmWebhookUrl', WEBHOOK_URL);
    const stack = new GrokBotAlarmForwardingStack(app, 'GrokBotAlarmForwardingStack', {
      env: {
        account: '123456789012',
        region: 'us-east-2',
      },
      grokBotAlarmWebhookUrl: 'https://example.com/from-prop',
    });
    Template.fromStack(stack).hasResourceProperties('AWS::Events::ApiDestination', {
      InvocationEndpoint: 'https://example.com/from-prop',
    });
  });

  it('passes cdk-nag', () => {
    const stack = alarmStack(WEBHOOK_URL);
    Template.fromStack(stack);
    expect(new AwsSolutionsChecks().validateScope(stack).violations).toEqual([]);
    expect(new ServerlessChecks().validateScope(stack).violations).toEqual([]);
  });
});
