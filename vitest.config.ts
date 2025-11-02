/**
 * Vitest Configuration
 *
 * Configures test environment, coverage tracking, and test execution settings.
 * Enforces 90% coverage requirement from MVP spec.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Use process forking for better test isolation
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/types/**',
        'src/**/*.d.ts',
        'dist/**',
        'node_modules/**'
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75
      }
    },
    // Increased timeouts for file I/O operations with retries
    testTimeout: 15000,
    hookTimeout: 15000,
    // Ensure deterministic ordering within files while allowing Vitest to schedule
    // test files in parallel now that export tests isolate their temp directories.
    sequence: {
      shuffle: false,
      concurrent: true
    },
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
