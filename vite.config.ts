import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite-plus';

const config = defineConfig({
  staged: { '*': 'vp check --fix' },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
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
