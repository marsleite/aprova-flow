import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@aprovamind/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@aprovamind/application': path.resolve(__dirname, '../../packages/application/src'),
      '@aprovamind/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
  },
});
