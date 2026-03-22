import {
  chat,
  convertMessagesToModelMessages,
  maxIterations,
  type ModelMessage,
  toServerSentEventsResponse,
  type UIMessage,
} from '@tanstack/ai';
import { createFileRoute } from '@tanstack/react-router';
import { bedrockText } from '#src/webapp/integrations/bedrock-adapter';
import { TANCHAT_MODEL_ID, getBedrockBudgetStatus } from '#src/webapp/lib/bedrock-budget';
import getTools from '#src/webapp/utils/demo.tools';

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

          const body = (await request.json()) as {
            messages: unknown[];
            data?: { conversationId?: string };
          };
          const messages = convertMessagesToModelMessages(
            body.messages as Array<ModelMessage | UIMessage>,
          );
          const conversationId = body.data?.conversationId;

          const tools = await getTools();

          const abortController = new AbortController();
          request.signal?.addEventListener('abort', () => abortController.abort());

          const stream = chat({
            adapter: bedrockText(TANCHAT_MODEL_ID),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- messages from client are valid at runtime
            messages: messages as any,
            systemPrompts: [SYSTEM_PROMPT],
            temperature: 0.7,
            maxTokens: 4096,
            tools,
            agentLoopStrategy: maxIterations(5),
            conversationId,
            abortController,
          });

          return toServerSentEventsResponse(stream, { abortController });
        } catch (error) {
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
