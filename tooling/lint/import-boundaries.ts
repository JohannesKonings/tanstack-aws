import type { OxlintOverride } from 'vite-plus/lint';

/**
 * Temporary exceptions: account setup may import only workload-region and
 * resource-tags from root lib until packages/infra-shared is extracted.
 */
export const accountSetupImportBoundaries = {
  files: ['apps/account-setup/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/src/**'],
            message: 'Account setup must not import web application source',
          },
          {
            group: ['**/apps/**'],
            message: 'Account setup must not import other workspace apps',
          },
          {
            group: [
              '**/lib/constructs/**',
              '**/lib/tanstack-aws*',
              '**/lib/stage-name*',
              '**/lib/aurora-schema*',
            ],
            message:
              'Account setup may only import workload-region and resource-tags from root lib (temporary until packages/infra-shared)',
          },
        ],
      },
    ],
  },
} satisfies OxlintOverride;

export const applicationImportBoundaries = {
  files: ['lib/**', 'src/**', 'bin/**', 'scripts/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/account-setup/**'],
            message: 'Application code must not import account-setup package internals',
          },
        ],
      },
    ],
  },
} satisfies OxlintOverride;
