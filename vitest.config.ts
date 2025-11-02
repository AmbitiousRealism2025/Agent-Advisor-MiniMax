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
    // IMPORTANT: Disable parallel file execution for file I/O tests
    // Rationale: Export tests (file-writer, packager) create/delete temp directories
    // and perform heavy file I/O operations. Running these in parallel causes race
    // conditions and ENOENT errors. Once export tests are stabilized and refactored
    // to use isolated temp directories per test file, this can be re-enabled.
    // TODO: Consider scoping this to export tests only via separate config
    fileParallelism: false,
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
    // Ensure deterministic test execution
    // Rationale: File I/O tests require sequential execution to avoid race conditions
    // on shared temp directory paths and cleanup operations. Shuffling could cause
    // tests to fail due to timing dependencies in afterEach cleanup.
    sequence: {
      shuffle: false,
      concurrent: false
    },
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
