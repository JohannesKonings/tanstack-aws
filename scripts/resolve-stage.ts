#!/usr/bin/env node

import { resolveStageName, type StageLifecycle } from '../lib/stage-name.ts';

type ResolveStageCliOptions = {
  stageInput?: string;
  lifecycle: StageLifecycle;
  maxLength?: number;
};

const parseArgs = (argv: string[]): ResolveStageCliOptions => {
  const options: ResolveStageCliOptions = {
    lifecycle: 'ephemeral',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextArg = argv[index + 1];
    if (!nextArg) {
      continue;
    }

    if (arg === '--stage') {
      options.stageInput = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--lifecycle' && (nextArg === 'ephemeral' || nextArg === 'permanent')) {
      options.lifecycle = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--max-length') {
      const parsed = Number.parseInt(nextArg, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.maxLength = parsed;
      }
      index += 1;
    }
  }

  return options;
};

const options = parseArgs(process.argv.slice(2));
const stageInput =
  options.stageInput ??
  process.env.APP_STAGE ??
  process.env.GITHUB_HEAD_REF ??
  process.env.GITHUB_REF_NAME;

const resolvedStage = resolveStageName(stageInput, {
  fallbackStage: 'dev',
  lifecycle: options.lifecycle,
  maxLength: options.maxLength,
});

process.stdout.write(resolvedStage);
