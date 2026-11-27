import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  GROK_BOT_ALARM_WEBHOOK_URL_CONTEXT_KEY,
  resolveGrokBotAlarmWebhookUrl,
} from './app-config.ts';
import { GrokBotAlarmForwarding } from './constructs/GrokBotAlarmForwarding.ts';

export interface GrokBotAlarmForwardingStackProps extends cdk.StackProps {
  /**
   * HTTPS endpoint that receives CloudWatch ALARM events.
   * Overrides CDK context `grokBotAlarmWebhookUrl`. Synth fails when both are omitted.
   */
  readonly grokBotAlarmWebhookUrl?: string;
}

/** EventBridge alarm forwarding in the workload region (us-east-2). */
export class GrokBotAlarmForwardingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: GrokBotAlarmForwardingStackProps) {
    super(scope, id, props);

    const forwarding = new GrokBotAlarmForwarding(this, 'Forwarding', {
      webhookUrl: resolveGrokBotAlarmWebhookUrl({
        prop: props?.grokBotAlarmWebhookUrl,
        context: this.node.tryGetContext(GROK_BOT_ALARM_WEBHOOK_URL_CONTEXT_KEY),
      }),
    });

    new cdk.CfnOutput(this, 'GrokBotAlarmRuleArn', {
      value: forwarding.rule.ruleArn,
      description: 'EventBridge rule that forwards CloudWatch ALARM events.',
    });
    new cdk.CfnOutput(this, 'GrokBotAlarmDlqArn', {
      value: forwarding.deadLetterQueue.queueArn,
      description: 'Dead-letter queue for failed Grok Bot alarm webhook posts.',
    });
  }
}
