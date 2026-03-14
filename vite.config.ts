import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite-plus';
import viteTsConfigPaths from 'vite-tsconfig-paths';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const devtoolsStubAliases = [
  {
    find: '@tanstack/react-ai-devtools',
    replacement: path.resolve(dirname, 'src/webapp/lib/ai-devtools-stub.ts'),
  },
  {
    find: '@tanstack/react-router-devtools',
    replacement: path.resolve(dirname, 'src/webapp/lib/router-devtools-stub.tsx'),
  },
] as const;

const aiDevtoolsStubPlugin = {
  config(_config: unknown, { command, isSsrBuild }: { command: string; isSsrBuild?: boolean }) {
    // Nitro/build pulls in @tanstack/ai-devtools-core (Solid.js) whose server build
    // lacks setStyleProperty. Use stub for SSR and for production build (Nitro phase).
    const useAiDevtoolsStub = isSsrBuild === true || command === 'build';

    if (!useAiDevtoolsStub) {
      return undefined;
    }

    return {
      resolve: {
        alias: devtoolsStubAliases,
      },
    };
  },
  name: 'ai-devtools-stub-alias',
};

const config = defineConfig({
  fmt: {
    ignorePatterns: ['src/webapp/routeTree.gen.ts'],
    singleQuote: true,
    sortImports: {
      ignoreCase: true,
      newlinesBetween: false,
      order: 'asc',
    },
  },
  lint: {
    categories: {
      correctness: 'error',
      perf: 'warn',
      style: 'warn',
    },
    ignorePatterns: ['src/webapp/routeTree.gen.ts'],
    plugins: ['react'],
    rules: {
      'no-console': 'error',
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
    options: {
      typeAware: true,
    },
  },
  server: {
    port: 3000,
  },
  test: {
    include: ['accountSetup/**/*.test.ts'],
  },
  plugins: [
    aiDevtoolsStubPlugin,
    devtools({
      removeDevtoolsOnBuild: false,
    }),
    nitro({
      awsLambda: { streaming: true },
      alias: {
        'mnemonist/lru-cache': 'mnemonist/lru-cache.js',
      },
      preset: 'aws-lambda',
    }),
    // This is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src/webapp',
    }),
    viteReact({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
  ],
});

export default config;
