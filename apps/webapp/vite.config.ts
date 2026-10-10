import path from 'node:path';
import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { cdkDevServer } from '@tanstack-aws/cdk-vite-plugin';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite-plus';
import { webappServerOutputs } from '../../apps/cdk-app/lib/webapp-server-environment.ts';

const isVitest = Boolean(process.env.VITEST);
const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageRoot, '../..');

export default defineConfig({
  root: packageRoot,
  publicDir: path.join(repoRoot, 'public'),
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.git/**', '.output/**', '.nitro/**', '.tanstack/**'],
  },
  plugins: isVitest
    ? []
    : [
        cdkDevServer({ outputs: webappServerOutputs }),
        devtools({
          removeDevtoolsOnBuild: true,
        }),
        nitro({
          awsLambda: { streaming: true },
          preset: 'aws-lambda',
          output: {
            dir: path.join(repoRoot, '.output'),
          },
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
