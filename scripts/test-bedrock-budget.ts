#!/usr/bin/env node
/**
 * Isolated test for the CloudWatch Bedrock metric API: calls GetMetricStatistics
 * for InputTokenCount and OutputTokenCount (namespace AWS/Bedrock, ModelId dimension)
 * for the whole current UTC day (midnight to midnight). Verifies the request in isolation.
 *
 * Usage: vp run test:bedrock-budget
 *        vp exec tsx scripts/test-bedrock-budget.ts
 *
 * Requires: AWS credentials (same as app) and network access.
 */

import {
  CloudWatchClient,
  type Dimension,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch';

const BEDROCK_NAMESPACE = 'AWS/Bedrock';
const MODEL_ID = 'us.amazon.nova-pro-v1:0';
const REGION = process.env.AWS_REGION ?? 'us-east-1';

/** Full UTC day: midnight today UTC to midnight tomorrow UTC (24 hours). */
function getWholeDayUtcRange(): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  return { start, end };
}

async function main() {
  const { start, end } = getWholeDayUtcRange();
  const dimensions: Dimension[] = [{ Name: 'ModelId', Value: MODEL_ID }];
  const periodSeconds = 3600;

  console.log('--- CloudWatch Bedrock metric request (whole UTC day) ---');
  console.log('  region:', REGION);
  console.log('  namespace:', BEDROCK_NAMESPACE);
  console.log('  dimensions:', JSON.stringify(dimensions, null, 2));
  console.log('  start (UTC):', start.toISOString());
  console.log('  end (UTC):', end.toISOString());
  console.log('  period (s):', periodSeconds);
  console.log('');

  const client = new CloudWatchClient({ region: REGION });

  console.log('  Request: InputTokenCount');
  const inputResult = await client.send(
    new GetMetricStatisticsCommand({
      Namespace: BEDROCK_NAMESPACE,
      MetricName: 'InputTokenCount',
      Dimensions: dimensions,
      StartTime: start,
      EndTime: end,
      Period: periodSeconds,
      Statistics: ['Sum'],
    }),
  );
  console.log('  Response label:', inputResult.Label);
  console.log('  Datapoints count:', inputResult.Datapoints?.length ?? 0);
  if (inputResult.Datapoints?.length) {
    const sum = inputResult.Datapoints.reduce((acc, dp) => acc + (dp.Sum ?? 0), 0);
    console.log('  Sum (input tokens):', sum);
  }
  console.log('');

  console.log('  Request: OutputTokenCount');
  const outputResult = await client.send(
    new GetMetricStatisticsCommand({
      Namespace: BEDROCK_NAMESPACE,
      MetricName: 'OutputTokenCount',
      Dimensions: dimensions,
      StartTime: start,
      EndTime: end,
      Period: periodSeconds,
      Statistics: ['Sum'],
    }),
  );
  console.log('  Response label:', outputResult.Label);
  console.log('  Datapoints count:', outputResult.Datapoints?.length ?? 0);
  if (outputResult.Datapoints?.length) {
    const sum = outputResult.Datapoints.reduce((acc, dp) => acc + (dp.Sum ?? 0), 0);
    console.log('  Sum (output tokens):', sum);
  }
  console.log('');

  const inputTokens = inputResult.Datapoints?.reduce((acc, dp) => acc + (dp.Sum ?? 0), 0) ?? 0;
  const outputTokens = outputResult.Datapoints?.reduce((acc, dp) => acc + (dp.Sum ?? 0), 0) ?? 0;

  console.log('--- Summary ---');
  console.log('  inputTokens:', inputTokens);
  console.log('  outputTokens:', outputTokens);
  console.log('  (Empty datapoints are normal if no Bedrock invocations today.)');
  console.log('');
  console.log('Done.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
