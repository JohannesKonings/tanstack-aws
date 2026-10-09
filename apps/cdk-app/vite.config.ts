import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.git/**', 'cdk.out/**'],
  },
});
