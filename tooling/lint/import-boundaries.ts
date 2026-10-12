import type { OxlintOverride } from 'vite-plus/lint';

/**
 * Temporary exceptions: account setup may import only workload-region and
 * resource-tags from root lib until packages/infra-shared is extracted.
 */
export const accountSetupImportBoundaries = {
  files: ['apps/cdk-account-setup/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/webapp/**'],
            message: 'Account setup must not import web application source',
          },
          {
            group: ['**/src/**'],
            message: 'Account setup must not import web application source',
          },
          {
            group: ['**/apps/cdk-app/**', '**/apps/webapp-admin/**'],
            message: 'Account setup must not import other workspace apps',
          },
          {
            group: ['**/apps/cdk-app/**', '**/lib/aurora-schema*', '**/lib/sse-stream-timeout*'],
            message:
              'Account setup may only import workload-region and resource-tags from root lib (temporary until packages/infra-shared)',
          },
        ],
      },
    ],
  },
} satisfies OxlintOverride;

export const cdkAppImportBoundaries = {
  files: ['apps/cdk-app/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/webapp/**', '**/apps/webapp-admin/**'],
            message: 'CDK app must not import web application source',
          },
          {
            group: ['**/src/**'],
            message:
              'CDK app must not import web application source (use repo-root paths for lambda entries)',
          },
          {
            group: ['**/apps/cdk-account-setup/**'],
            message: 'CDK app must not import account-setup package internals',
          },
          {
            group: ['**/packages/tanstack-ds/**'],
            message: 'CDK app must not import the DS registry package',
          },
        ],
      },
    ],
  },
} satisfies OxlintOverride;

const webappServerEnvironmentImport = {
  group: ['**/apps/cdk-app/lib/webapp-server-environment.ts'],
  message:
    'Only a Vite config may import the web server environment map, and only to pass it to the CDK dev server plugin',
};

export const webappImportBoundaries = {
  files: ['apps/webapp/**', '!apps/webapp/vite.config.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '**/apps/cdk-app/**',
              '**/apps/cdk-account-setup/**',
              '**/apps/webapp-admin/**',
            ],
            message: 'Webapp must not import other workspace apps',
          },
          webappServerEnvironmentImport,
          {
            group: ['**/packages/tanstack-ds/**'],
            message:
              'Webapp must not import the DS registry package — use shadcn add @tanstack-ds/<item> instead',
          },
        ],
      },
    ],
  },
} satisfies OxlintOverride;

export const webappViteConfigImportBoundaries = {
  files: ['apps/webapp/vite.config.ts', 'apps/webapp-admin/vite.config.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/cdk-app/**', '!**/apps/cdk-app/lib/webapp-server-environment.ts'],
            message: 'Vite config may import only the web server environment map from the CDK app',
          },
          {
            group: ['**/apps/cdk-account-setup/**', '**/apps/webapp/**', '**/apps/webapp-admin/**'],
            message: 'Vite config must not import other workspace apps',
          },
          {
            group: ['**/packages/tanstack-ds/**'],
            message:
              'Vite config must not import the DS registry package — use shadcn add @tanstack-ds/<item> instead',
          },
        ],
      },
    ],
  },
} satisfies OxlintOverride;

export const webappAdminImportBoundaries = {
  files: ['apps/webapp-admin/**', '!apps/webapp-admin/vite.config.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/webapp/**'],
            message: 'Webapp admin must not import primary Webapp source',
          },
          {
            group: ['**/apps/cdk-app/**', '**/apps/cdk-account-setup/**'],
            message: 'Webapp admin must not import other workspace apps',
          },
          webappServerEnvironmentImport,
          {
            group: ['**/packages/tanstack-ds/**'],
            message:
              'Webapp admin must not import the DS registry package — use shadcn add @tanstack-ds/<item> instead',
          },
        ],
      },
    ],
  },
} satisfies OxlintOverride;

export const applicationImportBoundaries = {
  files: ['lib/**', 'src/**', 'scripts/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/cdk-account-setup/**', '**/apps/cdk-app/**'],
            message: 'Application code must not import CDK package internals',
          },
          {
            group: ['**/packages/tanstack-ds/**'],
            message:
              'Application code must not import the DS registry package — use shadcn add @tanstack-ds/<item> instead',
          },
        ],
      },
    ],
  },
} satisfies OxlintOverride;
