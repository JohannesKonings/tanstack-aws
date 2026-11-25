import {
  chat,
  chatParamsFromRequest,
  maxIterations,
  toServerSentEventsResponse,
} from '@tanstack/ai';
import { createFileRoute } from '@tanstack/react-router';
import { bedrockText } from '#apps/webapp/integrations/bedrock-adapter';
import { getBedrockBudgetStatus, TANCHAT_MODEL_ID } from '#apps/webapp/lib/bedrock-budget';
import getTools from '#apps/webapp/utils/demo.tools';

const SYSTEM_PROMPT = `You are a helpful assistant for a store that sells guitars.

You can use the following tools to help the user:

- getGuitars: Get all guitars from the database
- recommendGuitar: Recommend a guitar to the user
`;

export const Route = createFileRoute('/demo/api/tanchat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Do not call Bedrock when daily budget is exceeded or when budget check fails.
          let budget: Awaited<ReturnType<typeof getBedrockBudgetStatus>>;
          try {
            budget = await getBedrockBudgetStatus(TANCHAT_MODEL_ID);
          } catch (budgetErr) {
            const message = budgetErr instanceof Error ? budgetErr.message : String(budgetErr);
            // oxlint-disable-next-line no-console
            console.error('Budget check failed:', budgetErr);
            return new Response(
              JSON.stringify({
                error: 'Budget check failed',
                code: 'BUDGET_CHECK_FAILED',
                detail: message,
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }
          if (budget.overBudget) {
            return new Response(
              JSON.stringify({
                error: 'Budget is empty for the day',
                code: 'BUDGET_EXCEEDED',
              }),
              {
                status: 402,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }

          const { messages, threadId, runId } = await chatParamsFromRequest(request);

          const tools = await getTools();

          const abortController = new AbortController();
          request.signal?.addEventListener('abort', () => abortController.abort());

          const stream = chat({
            adapter: bedrockText(TANCHAT_MODEL_ID),
            messages,
            systemPrompts: [SYSTEM_PROMPT],
            modelOptions: {
              temperature: 0.7,
              maxTokens: 4096,
            },
            tools,
            agentLoopStrategy: maxIterations(5),
            threadId,
            runId,
            abortController,
          });

          return toServerSentEventsResponse(stream, { abortController });
        } catch (error) {
          if (error instanceof Response) return error;
          const message = error instanceof Error ? error.message : String(error);
          // oxlint-disable-next-line no-console
          console.error('Chat API error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to process chat request', detail: message }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
      },
    },
  },
});
