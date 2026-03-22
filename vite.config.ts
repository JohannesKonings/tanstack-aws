import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite-plus';

const isVitest = Boolean(process.env.VITEST);

const config = defineConfig({
  lint: {
    ignorePatterns: [
      'dist/**',
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      '.vinxi/**',
      'cdk.out/**',
      'src/webapp/routeTree.gen.ts',
    ],
    categories: {
      correctness: 'error',
      perf: 'warn',
      style: 'off',
    },
    options: {
      typeAware: true,
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
  },
  fmt: {
    ignorePatterns: [
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      '.vinxi/**',
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
  staged: { '*': 'vp check --fix' },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: isVitest
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
      ],
});

export default config;
