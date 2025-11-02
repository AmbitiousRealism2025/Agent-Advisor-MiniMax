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
  // Give file system time to initialize
  await new Promise(resolve => setTimeout(resolve, 50));
  // Verify directories exist
  await fs.access(TEST_TEMP_DIR);

  await fs.mkdir(TEST_SESSIONS_DIR, { recursive: true });
  await new Promise(resolve => setTimeout(resolve, 50));
  await fs.access(TEST_SESSIONS_DIR);
});

// Cleanup after all tests
afterAll(async () => {
  // Longer delay to ensure all tests have fully completed
  await new Promise(resolve => setTimeout(resolve, 200));

  // Clean up temp directories with retry logic
  const cleanupDir = async (dirPath: string) => {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        return;
      } catch (error) {
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        } else {
          console.warn(`Failed to cleanup ${dirPath} after ${maxAttempts} attempts:`, error);
        }
      }
    }
  };

  try {
    await cleanupDir(TEST_TEMP_DIR);
    await cleanupDir(TEST_SESSIONS_DIR);
  } catch (error) {
    console.warn('Failed to clean up test directories:', error);
  }
});

// Cleanup after each test
afterEach(async () => {
  // Only clean up orphaned files, not directories being used by tests
  // Individual tests handle their own directory cleanup
  try {
    // Add delay to ensure test cleanup completes first
    await new Promise(resolve => setTimeout(resolve, 50));

    const tempFiles = await fs.readdir(TEST_TEMP_DIR);
    for (const file of tempFiles) {
      // Only clean up orphaned files, not directories
      const fullPath = path.join(TEST_TEMP_DIR, file);
      const stats = await fs.stat(fullPath);

      // Skip directories - let test-specific cleanup handle them
      if (stats.isDirectory()) {
        continue;
      }

      // Clean up loose files
      if (file.startsWith('test-') || file.startsWith('temp-')) {
        await fs.rm(fullPath, { force: true });
      }
    }
  } catch (error) {
    // Ignore if directory doesn't exist or is being cleaned by test
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // Only log non-ENOENT errors (uncomment for debugging)
      // console.warn('Global afterEach cleanup warning:', error);
    }
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
