import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  type Dimension,
} from '@aws-sdk/client-cloudwatch';
import { createServerFn } from '@tanstack/react-start';
import { DAILY_LIMIT_USD } from './bedrock-budget-config';

const BEDROCK_NAMESPACE = 'AWS/Bedrock';

/** Re-export for UI; backend config lives in bedrock-budget-config.ts. */
export { DAILY_LIMIT_USD };

/** Model ID used by tanchat; same as in api.tanchat and api.bedrock-budget. */
export const TANCHAT_MODEL_ID = 'us.amazon.nova-pro-v1:0';

/** Nova Pro: $ per 1M tokens (approximate; override via env) */
const _inputPrice = Number(process.env.BEDROCK_NOVA_INPUT_PRICE_PER_1M);
const PRICE_INPUT_PER_1M = Number.isNaN(_inputPrice) ? 3.5 : _inputPrice;
const _outputPrice = Number(process.env.BEDROCK_NOVA_OUTPUT_PRICE_PER_1M);
const PRICE_OUTPUT_PER_1M = Number.isNaN(_outputPrice) ? 8 : _outputPrice;

export type BedrockBudgetResult = {
  overBudget: boolean;
  estimatedCost: number;
  limit: number;
  inputTokens: number;
  outputTokens: number;
};

/** Full UTC day: midnight today UTC to midnight tomorrow UTC (same as test script). */
function getWholeDayUtcRange(): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  return { start, end };
}

async function getBedrockTokenUsageToday(
  client: CloudWatchClient,
  modelId: string,
): Promise<{ inputTokens: number; outputTokens: number }> {
  const { start, end } = getWholeDayUtcRange();
  const dimensions: Dimension[] = [{ Name: 'ModelId', Value: modelId }];
  const periodSeconds = 3600;

  const [inputResult, outputResult] = await Promise.all([
    client.send(
      new GetMetricStatisticsCommand({
        Namespace: BEDROCK_NAMESPACE,
        MetricName: 'InputTokenCount',
        Dimensions: dimensions,
        StartTime: start,
        EndTime: end,
        Period: periodSeconds,
        Statistics: ['Sum'],
      }),
    ),
    client.send(
      new GetMetricStatisticsCommand({
        Namespace: BEDROCK_NAMESPACE,
        MetricName: 'OutputTokenCount',
        Dimensions: dimensions,
        StartTime: start,
        EndTime: end,
        Period: periodSeconds,
        Statistics: ['Sum'],
      }),
    ),
  ]);

  const inputTokens = inputResult.Datapoints?.reduce((acc, dp) => acc + (dp.Sum ?? 0), 0) ?? 0;
  const outputTokens = outputResult.Datapoints?.reduce((acc, dp) => acc + (dp.Sum ?? 0), 0) ?? 0;

  return { inputTokens, outputTokens };
}

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_1M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M
  );
}

/**
 * Returns today's Bedrock usage and whether the daily budget limit is exceeded.
 * Use the same modelId as in your chat adapter (e.g. us.amazon.nova-pro-v1:0).
 */
export async function getBedrockBudgetStatus(
  modelId: string,
  region?: string,
): Promise<BedrockBudgetResult> {
  const client = new CloudWatchClient({
    region: region ?? process.env.AWS_REGION ?? 'us-east-1',
  });
  const { inputTokens, outputTokens } = await getBedrockTokenUsageToday(client, modelId);
  const estimatedCost = estimateCostUsd(inputTokens, outputTokens);
  const overBudget = estimatedCost >= DAILY_LIMIT_USD;
  return {
    overBudget,
    estimatedCost,
    limit: DAILY_LIMIT_USD,
    inputTokens,
    outputTokens,
  };
}

export type GetBedrockBudgetResult = {
  overBudget: boolean;
  estimatedCost: number;
  limit: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
};

/**
 * Server function for the budget UI. Call from the client instead of fetch('/demo/api/bedrock-budget').
 * Uses the same RPC as other server functions, so it works reliably in dev and prod.
 */
export const getBedrockBudget = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GetBedrockBudgetResult> => {
    try {
      const result = await getBedrockBudgetStatus(TANCHAT_MODEL_ID);
      return {
        overBudget: result.overBudget,
        estimatedCost: Math.round(result.estimatedCost * 100) / 100,
        limit: result.limit,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        overBudget: false,
        estimatedCost: 0,
        limit: DAILY_LIMIT_USD,
        inputTokens: 0,
        outputTokens: 0,
        error: message,
      };
    }
  },
);
