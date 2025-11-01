/**
 * Global Test Setup
 *
 * Runs before all tests to configure the testing environment.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test directories
export const TEST_TEMP_DIR = path.join(__dirname, '../test-temp');
export const TEST_SESSIONS_DIR = path.join(__dirname, '../test-sessions');

// Setup before all tests
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.MINIMAX_JWT_TOKEN = 'test-jwt-token';

  // Create temp directories
  await fs.mkdir(TEST_TEMP_DIR, { recursive: true });
  await fs.mkdir(TEST_SESSIONS_DIR, { recursive: true });
});

// Cleanup after all tests
afterAll(async () => {
  // Clean up temp directories
  try {
    await fs.rm(TEST_TEMP_DIR, { recursive: true, force: true });
    await fs.rm(TEST_SESSIONS_DIR, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to clean up test directories:', error);
  }
});

// Cleanup after each test
afterEach(async () => {
  // Clean up any test-specific temp files
  try {
    const tempFiles = await fs.readdir(TEST_TEMP_DIR);
    for (const file of tempFiles) {
      if (file.startsWith('test-') || file.startsWith('temp-')) {
        await fs.rm(path.join(TEST_TEMP_DIR, file), { recursive: true, force: true });
      }
    }
  } catch (error) {
    // Ignore if directory doesn't exist
  }
});

/**
 * Clean up test files utility
 */
export async function cleanupTestFiles(pattern: string): Promise<void> {
  try {
    const files = await fs.readdir(TEST_TEMP_DIR);
    for (const file of files) {
      if (file.includes(pattern)) {
        await fs.rm(path.join(TEST_TEMP_DIR, file), { recursive: true, force: true });
      }
    }
  } catch (error) {
    // Ignore errors
  }
}
