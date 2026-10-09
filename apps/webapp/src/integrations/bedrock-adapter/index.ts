/**
 * TanStack AI adapter for AWS Bedrock (ConverseStream API).
 * Uses @aws-sdk/client-bedrock-runtime and yields AG-UI StreamChunk events.
 */

import {
  BedrockRuntimeClient,
  type BedrockRuntimeClientConfig,
  type ContentBlock,
  ConverseCommand,
  type ConverseCommandInput,
  ConverseStreamCommand,
  type ConverseStreamCommandInput,
  type ConverseStreamOutput,
  type Message,
  type ToolResultBlock,
  type ToolUseBlock,
} from '@aws-sdk/client-bedrock-runtime';
import type { ContentPart, ModelMessage, StreamChunk, TextOptions, Tool } from '@tanstack/ai';
import { EventType } from '@tanstack/ai';
import type { JSONSchema } from '@tanstack/ai';
import { BaseTextAdapter } from '@tanstack/ai/adapters';
import type { StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';

/** Inline type compatible with AWS SDK credential resolution (no @smithy/types dependency). */
interface BedrockCredentialIdentity {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}
type BedrockCredentialsProvider = () => Promise<BedrockCredentialIdentity>;

function getTextFromContent(content: string | null | Array<ContentPart>): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  return content
    .filter((p): p is ContentPart & { type: 'text' } => p.type === 'text')
    .map((p) => p.content)
    .join('');
}

function textBlock(text: string): ContentBlock {
  return { text };
}

function toolUseBlock(toolUseId: string, name: string, input: object): ContentBlock {
  const block: ContentBlock = {
    toolUse: {
      toolUseId,
      name,
      input: input as ToolUseBlock['input'],
    },
  };
  return block;
}

function modelMessagesToBedrockMessages(messages: Array<ModelMessage>): Message[] {
  const out: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;

    if (msg.role === 'user') {
      const text = getTextFromContent(msg.content);
      out.push({
        role: 'user',
        content: [textBlock(text)],
      });
      continue;
    }

    if (msg.role === 'tool' && msg.toolCallId) {
      const prev = out[out.length - 1];
      const prevContent: ContentBlock[] = prev?.role === 'assistant' ? (prev.content ?? []) : [];
      const prevToolUseBlocks = prevContent.filter(
        (b): b is ContentBlock & { toolUse: ToolUseBlock } => 'toolUse' in b && b.toolUse != null,
      );
      const prevToolUseCount = prevToolUseBlocks.length;
      const prevToolUseIds = prevToolUseBlocks
        .map((b) => b.toolUse?.toolUseId)
        .filter(Boolean) as string[];

      const toolResultById = new Map<string, ToolResultBlock>();
      while (i < messages.length && messages[i]?.role === 'tool') {
        const toolMsg = messages[i]!;
        const toolCallId = toolMsg.toolCallId;
        if (toolCallId) {
          const text =
            typeof toolMsg.content === 'string' ? toolMsg.content : JSON.stringify(toolMsg.content);
          toolResultById.set(toolCallId, {
            toolUseId: toolCallId,
            content: [{ text }],
            status: 'success',
          });
        }
        i++;
      }
      i--;

      if (prevToolUseCount > 0) {
        const toolResultBlocks: ContentBlock[] = prevToolUseIds
          .map((id) => toolResultById.get(id))
          .filter((b): b is ToolResultBlock => b != null)
          .slice(0, prevToolUseCount)
          .map((tr): ContentBlock => ({ toolResult: tr }));
        if (toolResultBlocks.length > 0) {
          out.push({
            role: 'user',
            content: toolResultBlocks,
          });
        }
      }
      continue;
    }

    if (msg.role === 'assistant') {
      const blocks: ContentBlock[] = [];
      const text = getTextFromContent(msg.content);
      const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;

      if (hasToolCalls) {
        for (const tc of msg.toolCalls!) {
          const argsRaw = tc.function.arguments;
          const inputObj: object =
            typeof argsRaw === 'string'
              ? (() => {
                  try {
                    return JSON.parse(argsRaw) as object;
                  } catch {
                    return { value: argsRaw };
                  }
                })()
              : ((typeof argsRaw === 'object' && argsRaw !== null ? argsRaw : {}) as object);
          blocks.push(toolUseBlock(tc.id, tc.function.name, inputObj));
        }
      } else if (text) {
        blocks.push(textBlock(text));
      }

      if (blocks.length) {
        out.push({ role: 'assistant', content: blocks });
      }
    }
  }

  return out;
}

function toolsToBedrockToolConfig(tools: Array<Tool<any, any, any>> | undefined):
  | {
      tools: Array<{
        toolSpec: { name: string; description: string; inputSchema: { json: object } };
      }>;
    }
  | undefined {
  if (!tools?.length) return undefined;
  return {
    tools: tools.map((t) => ({
      toolSpec: {
        name: t.name,
        description: t.description ?? '',
        inputSchema: {
          json: (t.inputSchema as JSONSchema) ?? { type: 'object', properties: {} },
        },
      },
    })),
  };
}

export interface BedrockTextAdapterConfig {
  region?: string;
  /** Optional; uses default credential chain or AWS_BEARER_TOKEN_BEDROCK if set */
  credentials?: BedrockCredentialIdentity | BedrockCredentialsProvider;
}

export class BedrockTextAdapter extends BaseTextAdapter<
  string,
  Record<string, unknown>,
  readonly ['text'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- adapter metadata; SDK uses $unknown unions
  any
> {
  readonly name = 'bedrock' as const;
  private client: BedrockRuntimeClient;

  constructor(config: BedrockTextAdapterConfig, model: string) {
    super({}, model);
    const { region, credentials } = config;
    const clientConfig: BedrockRuntimeClientConfig = {
      region: region ?? process.env.AWS_REGION ?? 'us-east-1',
      ...(credentials != null && {
        credentials: credentials as BedrockRuntimeClientConfig['credentials'],
      }),
    };
    this.client = new BedrockRuntimeClient(clientConfig);
  }

  async *chatStream(options: TextOptions<Record<string, unknown>>): AsyncIterable<StreamChunk> {
    const {
      model,
      messages,
      tools,
      systemPrompts,
      temperature,
      topP,
      maxTokens,
      request,
      threadId: optionsThreadId,
      runId: optionsRunId,
    } = options;

    const bedrockMessages = modelMessagesToBedrockMessages(messages);
    const systemBlock =
      systemPrompts?.length && systemPrompts.some((s) => s.trim().length > 0)
        ? [{ text: systemPrompts.join('\n\n') }]
        : undefined;

    const toolConfig = toolsToBedrockToolConfig(tools);

    const inferenceConfig: Record<string, number> = {};
    if (temperature != null) inferenceConfig.temperature = temperature;
    if (topP != null) inferenceConfig.topP = topP;
    if (maxTokens != null) inferenceConfig.maxTokens = maxTokens;

    const timestamp = Date.now();
    const runId = optionsRunId ?? this.generateId();
    const threadId = optionsThreadId ?? runId;
    let messageId = this.generateId();
    let hasEmittedRunStarted = false;
    let hasEmittedTextMessageStart = false;
    let hasEmittedRunFinished = false;
    let pendingRunFinished: { stopReason: string; finishReason: 'stop' | 'tool_calls' } | null =
      null;
    const toolCallIds = new Map<number, { id: string; name: string }>();
    let toolArgsAccum: Record<number, string> = {};

    const streamInput = {
      modelId: model,
      messages: bedrockMessages,
      system: systemBlock,
      inferenceConfig: Object.keys(inferenceConfig).length ? inferenceConfig : undefined,
      toolConfig,
    };

    try {
      const command = new ConverseStreamCommand(streamInput as ConverseStreamCommandInput);
      const response = await this.client.send(command, {
        abortSignal: request?.signal ?? undefined,
      });

      const stream = response.stream as AsyncIterable<ConverseStreamOutput>;
      if (!stream) {
        yield {
          type: EventType.RUN_ERROR,
          message: 'No stream in Bedrock response',
          timestamp,
        };
        return;
      }

      for await (const event of stream) {
        if (!hasEmittedRunStarted) {
          hasEmittedRunStarted = true;
          yield {
            type: EventType.RUN_STARTED,
            threadId,
            runId,
            model,
            timestamp,
          };
        }

        if (event.contentBlockStart?.start?.toolUse) {
          const tu = event.contentBlockStart.start.toolUse;
          const idx = event.contentBlockStart.contentBlockIndex ?? 0;
          const toolCallId = tu.toolUseId ?? this.generateId();
          toolCallIds.set(idx, {
            id: toolCallId,
            name: tu.name ?? '',
          });
          toolArgsAccum[idx] = '';
          yield {
            type: EventType.TOOL_CALL_START,
            toolCallId,
            toolCallName: tu.name ?? '',
            toolName: tu.name ?? '',
            parentMessageId: messageId,
            model,
            timestamp,
            index: idx,
          };
        }

        if (event.contentBlockDelta?.delta?.text) {
          const delta = event.contentBlockDelta.delta.text ?? '';
          if (delta) {
            if (!hasEmittedTextMessageStart) {
              hasEmittedTextMessageStart = true;
              yield {
                type: EventType.TEXT_MESSAGE_START,
                messageId,
                model,
                timestamp,
                role: 'assistant',
              };
            }
            yield {
              type: EventType.TEXT_MESSAGE_CONTENT,
              messageId,
              model,
              timestamp,
              delta,
            };
          }
        }

        if (event.contentBlockDelta?.delta?.toolUse?.input) {
          const delta = event.contentBlockDelta.delta.toolUse.input ?? '';
          const idx = event.contentBlockDelta.contentBlockIndex ?? 0;
          toolArgsAccum[idx] = (toolArgsAccum[idx] ?? '') + delta;
          yield {
            type: EventType.TOOL_CALL_ARGS,
            toolCallId: toolCallIds.get(idx)?.id ?? '',
            model,
            timestamp,
            delta,
          };
        }

        if (event.contentBlockStop) {
          const idx = event.contentBlockStop.contentBlockIndex ?? 0;
          const meta = toolCallIds.get(idx);
          if (meta) {
            const argsStr = toolArgsAccum[idx] ?? '{}';
            let input: unknown = {};
            try {
              input = JSON.parse(argsStr);
            } catch {
              input = { raw: argsStr };
            }
            yield {
              type: EventType.TOOL_CALL_END,
              toolCallId: meta.id,
              toolName: meta.name,
              model,
              timestamp,
              input,
            };
            toolCallIds.delete(idx);
            delete toolArgsAccum[idx];
          }
        }

        if (event.messageStop) {
          if (hasEmittedTextMessageStart) {
            yield {
              type: EventType.TEXT_MESSAGE_END,
              messageId,
              model,
              timestamp,
            };
          }
          const stopReason = event.messageStop.stopReason ?? 'stop';
          const finishReason =
            stopReason === 'tool_use' ? 'tool_calls' : stopReason === 'end_turn' ? 'stop' : 'stop';
          pendingRunFinished = { stopReason, finishReason };
        }

        if (event.metadata?.usage) {
          const u = event.metadata.usage;
          const inputTokens = u.inputTokens ?? 0;
          const outputTokens = u.outputTokens ?? 0;
          const usage = {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
          };
          const finishReason = pendingRunFinished?.finishReason ?? 'stop';
          hasEmittedRunFinished = true;
          pendingRunFinished = null;
          yield {
            type: EventType.RUN_FINISHED,
            threadId,
            runId,
            model,
            timestamp,
            finishReason,
            usage,
          };
        }

        if (event.internalServerException) {
          yield {
            type: EventType.RUN_ERROR,
            message: event.internalServerException.message ?? 'Internal server error',
            model,
            timestamp,
          };
        }
        if (event.modelStreamErrorException) {
          yield {
            type: EventType.RUN_ERROR,
            message:
              event.modelStreamErrorException.originalMessage ??
              event.modelStreamErrorException.message ??
              'Model stream error',
            model,
            timestamp,
          };
        }
        if (event.throttlingException) {
          yield {
            type: EventType.RUN_ERROR,
            message: event.throttlingException.message ?? 'Throttling',
            code: 'throttling',
            model,
            timestamp,
          };
        }
        if (event.validationException) {
          yield {
            type: EventType.RUN_ERROR,
            message: event.validationException.message ?? 'Validation error',
            model,
            timestamp,
          };
        }
      }

      if (pendingRunFinished && !hasEmittedRunFinished) {
        yield {
          type: EventType.RUN_FINISHED,
          threadId,
          runId,
          model,
          timestamp,
          finishReason: pendingRunFinished.finishReason,
          usage: undefined,
        };
      }
    } catch {
      // Fallback: use non-streaming ConverseCommand (same API as test-bedrock-chat.ts).
      // ConverseStream requires bedrock:InvokeModelWithResponseStream; Converse only needs bedrock:InvokeModel.
      try {
        const converseCommand = new ConverseCommand(streamInput as ConverseCommandInput);
        const converseResponse = await this.client.send(converseCommand, {
          abortSignal: request?.signal ?? undefined,
        });

        const outMsg = converseResponse.output?.message;
        const content = outMsg?.content ?? [];

        if (!hasEmittedRunStarted) {
          hasEmittedRunStarted = true;
          yield {
            type: EventType.RUN_STARTED,
            threadId,
            runId,
            model,
            timestamp,
          };
        }

        for (const block of content) {
          if (block && 'text' in block && typeof (block as { text?: string }).text === 'string') {
            const text = (block as { text: string }).text;
            if (text) {
              if (!hasEmittedTextMessageStart) {
                hasEmittedTextMessageStart = true;
                yield {
                  type: EventType.TEXT_MESSAGE_START,
                  messageId,
                  model,
                  timestamp,
                  role: 'assistant',
                };
              }
              yield {
                type: EventType.TEXT_MESSAGE_CONTENT,
                messageId,
                model,
                timestamp,
                delta: text,
              };
            }
          }
          if (block && 'toolUse' in block && (block as { toolUse?: unknown }).toolUse) {
            const tu = (block as { toolUse: { toolUseId: string; name: string; input?: unknown } })
              .toolUse;
            const toolCallId = tu.toolUseId ?? this.generateId();
            const toolName = tu.name ?? '';
            const inputObj = tu.input ?? {};
            yield {
              type: EventType.TOOL_CALL_START,
              toolCallId,
              toolCallName: toolName,
              toolName,
              parentMessageId: messageId,
              model,
              timestamp,
              index: 0,
            };
            yield {
              type: EventType.TOOL_CALL_ARGS,
              toolCallId,
              model,
              timestamp,
              delta: typeof inputObj === 'string' ? inputObj : JSON.stringify(inputObj),
            };
            yield {
              type: EventType.TOOL_CALL_END,
              toolCallId,
              toolName,
              model,
              timestamp,
              input:
                typeof inputObj === 'object' && inputObj !== null ? inputObj : { value: inputObj },
            };
          }
        }

        if (hasEmittedTextMessageStart) {
          yield {
            type: EventType.TEXT_MESSAGE_END,
            messageId,
            model,
            timestamp,
          };
        }

        const stopReason = converseResponse.stopReason ?? 'end_turn';
        const finishReason =
          stopReason === 'tool_use' ? 'tool_calls' : stopReason === 'end_turn' ? 'stop' : 'stop';
        const convUsage = converseResponse.usage;
        const usage =
          convUsage != null
            ? {
                promptTokens: convUsage.inputTokens ?? 0,
                completionTokens: convUsage.outputTokens ?? 0,
                totalTokens: (convUsage.inputTokens ?? 0) + (convUsage.outputTokens ?? 0),
              }
            : undefined;
        yield {
          type: EventType.RUN_FINISHED,
          threadId,
          runId,
          model,
          timestamp,
          finishReason,
          usage,
        };
      } catch (converseErr) {
        yield {
          type: EventType.RUN_ERROR,
          message: converseErr instanceof Error ? converseErr.message : String(converseErr),
          model,
          timestamp,
        };
      }
    }
  }

  async structuredOutput(
    _options: StructuredOutputOptions<Record<string, unknown>>,
  ): Promise<StructuredOutputResult<unknown>> {
    throw new Error(
      'Bedrock adapter does not support structuredOutput; use stream: false and parse the collected text.',
    );
  }
}

export function bedrockText(model: string, config?: BedrockTextAdapterConfig): BedrockTextAdapter {
  return new BedrockTextAdapter(config ?? {}, model);
}
