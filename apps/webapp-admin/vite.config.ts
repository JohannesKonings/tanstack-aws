import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite-plus';

const isVitest = Boolean(process.env.VITEST);

export default defineConfig({
  plugins: isVitest
    ? []
    : [
        nitro({
          awsLambda: { streaming: true },
          preset: 'aws-lambda',
        }),
        tailwindcss(),
        tanstackStart({
          importProtection: {
            behavior: 'error',
          },
        }),
        viteReact(),
        babel({
          presets: [reactCompilerPreset()],
        }),
      ],
});
