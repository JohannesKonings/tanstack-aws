#!/usr/bin/env node
/**
 * Isolated test for the Bedrock SDK: calls the same model used by the app
 * (us.amazon.nova-pro-v1:0) with a chat prompt like "list all guitars" to verify
 * the request to Bedrock. Runs both Converse (non-streaming) and ConverseStream.
 *
 * Usage: pnpm test:bedrock
 *        pnpm exec tsx scripts/test-bedrock-chat.ts
 *        pnpm exec tsx scripts/test-bedrock-chat.ts --stream  # streaming only
 *        pnpm exec tsx scripts/test-bedrock-chat.ts --converse # non-streaming only
 * Requires: AWS credentials and network access.
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

const MODEL_ID = 'us.amazon.nova-pro-v1:0';
const REGION = process.env.AWS_REGION ?? 'us-east-1';
const PROMPT = 'List all guitars. Reply in a short bullet list.';

const client = new BedrockRuntimeClient({ region: REGION });

async function runConverse() {
  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: PROMPT }] }],
    inferenceConfig: { maxTokens: 1024, temperature: 0.7 },
  });

  console.log('--- Converse (non-streaming) ---');
  console.log('  modelId:', MODEL_ID);
  console.log('  prompt:', PROMPT);
  console.log('');

  const response = await client.send(command);

  const message = response.output?.message;
  const content = message?.content ?? [];
  const textBlocks = content.filter(
    (block): block is { text: string } =>
      'text' in block && typeof (block as { text?: string }).text === 'string',
  );
  const replyText = textBlocks
    .map((b) => b.text)
    .join('')
    .trim();

  console.log('  stopReason:', response.stopReason);
  console.log('  usage:', response.usage);
  console.log('  reply:', replyText || '(no text)');
  console.log('');
  console.log('OK – Converse succeeded.');
}

async function runConverseStream() {
  const command = new ConverseStreamCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: PROMPT }] }],
    inferenceConfig: { maxTokens: 1024, temperature: 0.7 },
  });

  console.log('--- ConverseStream ---');
  console.log('  modelId:', MODEL_ID);
  console.log('  prompt:', PROMPT);
  console.log('  stream:');

  const response = await client.send(command);
  const stream = response.stream;
  if (!stream) {
    throw new Error('No stream in Bedrock ConverseStream response');
  }

  let replyText = '';
  let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;

  for await (const event of stream) {
    if (event.contentBlockDelta?.delta?.text) {
      const delta = event.contentBlockDelta.delta.text ?? '';
      if (delta) {
        replyText += delta;
        process.stdout.write(delta);
      }
    }
    if (event.metadata?.usage) {
      usage = event.metadata.usage;
    }
  }

  console.log('');
  console.log('  usage:', usage);
  console.log('  full reply length:', replyText.length, 'chars');
  console.log('');
  console.log('OK – ConverseStream succeeded.');
}

async function main() {
  const args = process.argv.slice(2);
  const streamOnly = args.includes('--stream');
  const converseOnly = args.includes('--converse');

  if (streamOnly) {
    await runConverseStream();
    return;
  }
  if (converseOnly) {
    await runConverse();
    return;
  }

  console.log('Calling Bedrock (same model as app):', MODEL_ID, REGION);
  console.log('');

  await runConverse();
  console.log('');
  await runConverseStream();
}

main().catch((err) => {
  console.error('Bedrock request failed:', err);
  process.exit(1);
});
