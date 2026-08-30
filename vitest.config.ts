import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@angular-motion/core': fileURLToPath(
        new URL('./packages/core/src/index.ts', import.meta.url)
      ),
      '@angular-motion/motion': fileURLToPath(
        new URL('./packages/motion/src/index.ts', import.meta.url)
      ),
      '@angular-motion/presets': fileURLToPath(
        new URL('./packages/presets/src/index.ts', import.meta.url)
      )
    }
  },
  test: {
    environment: 'happy-dom',
    include: ['packages/**/*.spec.ts'],
    setupFiles: ['./test/setup-angular.ts']
  }
});
