import { formatSideProjectLabel, VITE_PLUS_BASE_VERSION } from '@vite-plus-base/core';

export function getTanstackAwsClientInfo() {
  return {
    label: formatSideProjectLabel('tanstack-aws'),
    baseVersion: VITE_PLUS_BASE_VERSION,
  };
}
