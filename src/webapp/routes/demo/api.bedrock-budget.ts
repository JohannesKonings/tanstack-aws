import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { getBedrockBudgetStatus, TANCHAT_MODEL_ID } from '#src/webapp/lib/bedrock-budget';
import { DAILY_LIMIT_USD } from '#src/webapp/lib/bedrock-budget-config';

const BUDGET_REQUEST_TIMEOUT_MS = 15_000;

export const Route = createFileRoute('/demo/api/bedrock-budget')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await Promise.race([
            getBedrockBudgetStatus(TANCHAT_MODEL_ID),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('CloudWatch request timed out')),
                BUDGET_REQUEST_TIMEOUT_MS,
              ),
            ),
          ]);
          return json({
            overBudget: result.overBudget,
            estimatedCost: Math.round(result.estimatedCost * 100) / 100,
            limit: DAILY_LIMIT_USD,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return json({
            overBudget: false,
            estimatedCost: 0,
            limit: DAILY_LIMIT_USD,
            error: message,
          });
        }
      },
    },
  },
});
