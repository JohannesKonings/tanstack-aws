import {
  isPermanentStageName,
  resolveStageName,
  type StageLifecycle,
} from '../../../lib/stage-name.ts';
import { resolveStageDatabaseName } from './stage-database-name.ts';

const DETACHED_HEAD = 'HEAD';

export type WorkloadStackStageInput = {
  /** `APP_STAGE`. When set, it replaces the git branch. Prod is selected only from this value. */
  appStage?: string;
  /** `git rev-parse --abbrev-ref HEAD`. `HEAD` or absent means a detached checkout. */
  branch: string | undefined;
};

export type WorkloadStackStage = {
  databaseName: string;
  stackName: string;
  stageName: string;
};

const configuredValue = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const lifecycleFor = (rawStage: string, source: 'app-stage' | 'branch'): StageLifecycle => {
  const sanitized = resolveStageName(rawStage, { lifecycle: 'permanent' });
  if (source === 'branch') {
    return sanitized === 'main' ? 'permanent' : 'ephemeral';
  }
  return isPermanentStageName(sanitized) ? 'permanent' : 'ephemeral';
};

export const resolveWorkloadStackStage = (
  input: WorkloadStackStageInput,
): WorkloadStackStage | undefined => {
  const appStage = configuredValue(input.appStage);
  const branch = configuredValue(input.branch);
  const detached = branch === undefined || branch === DETACHED_HEAD;
  const rawStage = appStage ?? (detached ? undefined : branch);
  if (rawStage === undefined) {
    return undefined;
  }

  const stageName = resolveStageName(rawStage, {
    lifecycle: lifecycleFor(rawStage, appStage === undefined ? 'branch' : 'app-stage'),
  });

  return {
    databaseName: resolveStageDatabaseName(stageName),
    stackName: `TanstackAwsStack-${stageName}`,
    stageName,
  };
};
