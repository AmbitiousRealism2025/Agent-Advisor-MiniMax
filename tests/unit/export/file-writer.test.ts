/**
 * Unit Tests - FileWriter
 *
 * Tests file write/read/delete operations and directory management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileWriter } from '../../../src/lib/export/file-writer.js';
import { createTempDirectory, cleanupTempDirectory, waitForFileExists } from '../../utils/test-helpers.js';
import { promises as fs } from 'fs';
import path from 'path';

describe.sequential('FileWriter', () => {
  let tempDir: string;
  let fileWriter: FileWriter;

  beforeEach(async () => {
    tempDir = await createTempDirectory('filewriter');
    // Give file system time to fully initialize the directory
    await new Promise(resolve => setTimeout(resolve, 50));
    fileWriter = new FileWriter();
  });

  afterEach(async () => {
    // Short delay to ensure all file handles are closed
    await new Promise(resolve => setTimeout(resolve, 50));
    // cleanupTempDirectory already has retry logic built in
    await cleanupTempDirectory(tempDir);
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';

      const result = await fileWriter.writeFile(filePath, content);

      expect(result.success).toBe(true);
      expect(result.path).toBe(filePath);

      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should create parent directories when createParentDirs is true', async () => {
      const filePath = path.join(tempDir, 'nested', 'deep', 'test.txt');
      const content = 'Nested file';

      const result = await fileWriter.writeFile(filePath, content, { createParentDirs: true });

      expect(result.success).toBe(true);
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should respect overwrite option', async () => {
      const filePath = path.join(tempDir, 'overwrite-test.txt');
      const originalContent = 'Original';
      const newContent = 'Updated';

      // Write original file
      await fileWriter.writeFile(filePath, originalContent);

      // Try to write without overwrite
      const resultNoOverwrite = await fileWriter.writeFile(filePath, newContent, { overwrite: false });
      expect(resultNoOverwrite.success).toBe(false);

      // Verify original content remains
      const contentAfterFailure = await fs.readFile(filePath, 'utf-8');
      expect(contentAfterFailure).toBe(originalContent);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      const exists = await fileWriter.fileExists(filePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'does-not-exist.txt');

      const exists = await fileWriter.fileExists(filePath);
      expect(exists).toBe(false);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory', async () => {
      const dirPath = path.join(tempDir, 'new-directory');

      await fileWriter.ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should be idempotent', async () => {
      const dirPath = path.join(tempDir, 'idempotent-dir');

      await fileWriter.ensureDirectory(dirPath);
      await fileWriter.ensureDirectory(dirPath); // Second call should not fail

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const filePath = path.join(tempDir, 'delete-me.txt');
      await fs.writeFile(filePath, 'content');

      const result = await fileWriter.deleteFile(filePath);

      expect(result).toBe(true);

      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should return false when deleting non-existent file', async () => {
      const filePath = path.join(tempDir, 'does-not-exist.txt');

      const result = await fileWriter.deleteFile(filePath);

      expect(result).toBe(false);
    });
  });

  describe('copyFile', () => {
    it('should copy file to new location', async () => {
      const sourcePath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'dest.txt');
      const content = 'Copy me!';

      await fs.writeFile(sourcePath, content);

      const result = await fileWriter.copyFile(sourcePath, destPath);

      // Wait for destination file to exist
      await waitForFileExists(destPath);

      expect(result.success).toBe(true);

      const destContent = await fs.readFile(destPath, 'utf-8');
      expect(destContent).toBe(content);

      // Source should still exist
      const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      expect(sourceExists).toBe(true);
    });
  });

  describe('writeMultipleFiles', () => {
    it('should write multiple files successfully', async () => {
      const files = [
        { relativePath: 'file1.txt', content: 'Content 1' },
        { relativePath: 'file2.txt', content: 'Content 2' },
        { relativePath: 'nested/file3.txt', content: 'Content 3' }
      ];

      const results = await fileWriter.writeMultipleFiles(files, {
        baseDir: tempDir,
        overwrite: true,
        createParentDirs: true
      });

      // Wait for first file as sentinel to confirm operations started
      const firstFilePath = path.join(tempDir, files[0].relativePath);
      await waitForFileExists(firstFilePath, 2000);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      // Verify all files exist with correct content
      for (const file of files) {
        const fullPath = path.join(tempDir, file.relativePath);

        // Wait for each file to be accessible
        const exists = await waitForFileExists(fullPath);
        expect(exists).toBe(true);

        const content = await fs.readFile(fullPath, 'utf-8');
        expect(content).toBe(file.content);

        // Small delay between file checks
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('should handle partial failures gracefully', async () => {
      // Create a file first so we can test overwrite: false
      const existingPath = path.join(tempDir, 'existing.txt');
      await fs.writeFile(existingPath, 'Original content');

      const files = [
        { relativePath: 'new-file.txt', content: 'New content' },
        { relativePath: 'existing.txt', content: 'Overwrite attempt' },
        { relativePath: 'another-new.txt', content: 'Another new' }
      ];

      const results = await fileWriter.writeMultipleFiles(files, {
        baseDir: tempDir,
        overwrite: false, // This will cause existing.txt to fail
        createParentDirs: true
      });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('already exists');
      expect(results[2].success).toBe(true);

      // Verify the other files still wrote successfully
      const newFileContent = await fs.readFile(path.join(tempDir, 'new-file.txt'), 'utf-8');
      expect(newFileContent).toBe('New content');

      const anotherNewContent = await fs.readFile(path.join(tempDir, 'another-new.txt'), 'utf-8');
      expect(anotherNewContent).toBe('Another new');

      // Verify original content remains
      const originalContent = await fs.readFile(existingPath, 'utf-8');
      expect(originalContent).toBe('Original content');
    });
  });

  describe('listFiles', () => {
    it('should list all files in directory', async () => {
      // Create several files
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content2');
      await fs.writeFile(path.join(tempDir, 'file3.log'), 'content3');

      // Wait for last file to confirm all writes completed
      await waitForFileExists(path.join(tempDir, 'file3.log'));

      // Create a subdirectory (should not be included in results)
      await fs.mkdir(path.join(tempDir, 'subdir'));

      // Verify subdirectory exists
      await fs.access(path.join(tempDir, 'subdir'));

      const files = await fileWriter.listFiles(tempDir);

      expect(files).toHaveLength(3);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain('file3.log');
      expect(files).not.toContain('subdir');
    });

    it('should throw error when directory does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      await expect(fileWriter.listFiles(nonExistentDir)).rejects.toThrow(
        /Failed to list files in/
      );
    });
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      const filePath = path.join(tempDir, 'read-test.txt');
      const content = 'Hello, read test!';
      await fs.writeFile(filePath, content);

      const readContent = await fileWriter.readFile(filePath);

      expect(readContent).toBe(content);
    });

    it('should throw error when file does not exist', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.txt');

      await expect(fileWriter.readFile(nonExistentFile)).rejects.toThrow(
        /Failed to read file/
      );
    });
  });

  describe('writeFile edge cases', () => {
    it('should fail when createParentDirs is false and parent does not exist', async () => {
      const nestedPath = path.join(tempDir, 'nonexistent', 'nested', 'file.txt');

      const result = await fileWriter.writeFile(nestedPath, 'content', {
        createParentDirs: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
