import { defineWorkspaceConfig } from '@jaykingson/vite-plus-base';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import type { PluginOption } from 'vite-plus';
import {
  accountSetupImportBoundaries,
  applicationImportBoundaries,
} from './tooling/lint/import-boundaries.ts';

const isVitest = Boolean(process.env.VITEST);

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
        'account-setup': {
          glossary: 'apps/account-setup/GLOSSARY.md',
          adr: 'docs/adr',
        },
        'tanstack-ds': {
          glossary: 'packages/tanstack-ds/GLOSSARY.md',
          adr: 'docs/adr',
        },
      },
    },
  },
  experimental: {
    bundledDev: true,
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
      'src/webapp/routeTree.gen.ts',
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
    overrides: [accountSetupImportBoundaries, applicationImportBoundaries],
  },
  fmt: {
    ignorePatterns: [
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      'cdk.out/**',
      'docs/PLAN-DB-PERSONS.md',
      'src/webapp/routeTree.gen.ts',
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
    include: ['lib/**/*.test.ts'],
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
  plugins: (isVitest
    ? []
    : [
        devtools({
          removeDevtoolsOnBuild: true,
        }),
        nitro({
          awsLambda: { streaming: true },
          // Alias: {
          //   'mnemonist/lru-cache': 'mnemonist/lru-cache.js',
          // },
          preset: 'aws-lambda',
        }),
        tailwindcss(),
        tanstackStart({
          srcDirectory: 'src/webapp',
          importProtection: {
            // Always error, even in dev
            behavior: 'error',
          },
        }),
        viteReact(),
        babel({
          presets: [reactCompilerPreset()],
        }),
      ]) as PluginOption[],
});
