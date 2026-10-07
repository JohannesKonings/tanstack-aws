import { defineWorkspaceConfig } from '@jaykingson/vite-plus-base';
import {
  accountSetupImportBoundaries,
  applicationImportBoundaries,
  cdkAppImportBoundaries,
  webappAdminImportBoundaries,
  webappImportBoundaries,
} from './tooling/lint/import-boundaries.ts';

export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: {
      name: 'tanstack-aws',
    },
    blockAgentSkills: {
      glossaryMap: {
        root: {
          glossary: 'GLOSSARY.md',
          adr: 'docs/adr',
        },
        'cdk-account-setup': {
          glossary: 'apps/cdk-account-setup/GLOSSARY.md',
          adr: 'docs/adr',
        },
        'cdk-app': {
          glossary: 'GLOSSARY.md',
          adr: 'docs/adr',
        },
        'tanstack-ds': {
          glossary: 'packages/tanstack-ds/GLOSSARY.md',
          adr: 'docs/adr',
        },
        webapp: {
          glossary: 'GLOSSARY.md',
          adr: 'docs/adr',
        },
        'webapp-admin': {
          glossary: 'GLOSSARY.md',
          adr: 'docs/adr',
        },
      },
    },
  },
  experimental: {
    bundledDev: false,
  },
  server: {
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['error', 'warn'],
    },
  },
  lint: {
    ignorePatterns: [
      'dist/**',
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      'cdk.out/**',
      'apps/webapp/src/routeTree.gen.ts',
      'apps/webapp-admin/src/routeTree.gen.ts',
      'packages/tanstack-ds/registry/**/*.tsx',
    ],
    categories: {
      correctness: 'error',
      perf: 'warn',
      style: 'off',
    },
    plugins: ['react'],
    rules: {
      'capitalized-comments': 'off',
      'func-style': 'off',
      'id-length': 'off',
      'init-declarations': 'off',
      'max-statements': 'off',
      'no-console': 'off',
      'no-magic-numbers': 'off',
      'no-ternary': 'off',
      'prefer-destructuring': 'off',
      'react/jsx-max-depth': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/no-array-index-key': 'off',
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          ignoreCase: true,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
          allowSeparatedGroups: true,
        },
      ],
      'sort-keys': 'off',
      'typescript/no-floating-promises': 'error',
    },
    overrides: [
      accountSetupImportBoundaries,
      applicationImportBoundaries,
      cdkAppImportBoundaries,
      webappAdminImportBoundaries,
      webappImportBoundaries,
    ],
  },
  fmt: {
    ignorePatterns: [
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      'cdk.out/**',
      'docs/PLAN-DB-PERSONS.md',
      'packages/tanstack-ds/public/r/**',
      'apps/webapp/src/routeTree.gen.ts',
      'apps/webapp-admin/src/routeTree.gen.ts',
    ],
    singleQuote: true,
    experimentalSortImports: {
      ignoreCase: true,
      newlinesBetween: false,
      order: 'asc',
    },
  },
  test: {
    environment: 'node',
    include: ['tooling/**/*.{test,spec}.{ts,tsx}', 'lib/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      'cdk.out/**',
      'dist/**',
    ],
  },
});
