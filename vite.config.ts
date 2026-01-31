import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const config = defineConfig(({ command, ssr }) => {
  // Nitro/build pulls in @tanstack/ai-devtools-core (Solid.js) whose server build
  // lacks setStyleProperty. Use stub for SSR and for production build (Nitro phase).
  const useAiDevtoolsStub = ssr === true || command === 'build';
  return {
    resolve: {
      alias:
        useAiDevtoolsStub
          ? [
              {
                find: '@tanstack/react-ai-devtools',
                replacement: path.resolve(dirname, 'src/webapp/lib/ai-devtools-stub.ts'),
              },
              {
                find: '@tanstack/react-router-devtools',
                replacement: path.resolve(dirname, 'src/webapp/lib/router-devtools-stub.tsx'),
              },
            ]
          : [],
    },
  plugins: [
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
  };
});

export default config;
