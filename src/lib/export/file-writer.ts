import { promises as fs } from 'fs';
import { dirname, join } from 'path';

export interface WriteFileOptions {
  overwrite?: boolean;
  createParentDirs?: boolean;
  encoding?: BufferEncoding;
}

export interface WriteMultipleFilesOptions {
  baseDir: string;
  overwrite?: boolean;
  createParentDirs?: boolean;
}

export interface FileWriteResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * FileWriter - Handles file system operations for agent project generation
 */
export class FileWriter {
  private defaultEncoding: BufferEncoding = 'utf-8';

  /**
   * Write a single file to disk
   */
  async writeFile(
    path: string,
    content: string,
    options: WriteFileOptions = {}
  ): Promise<FileWriteResult> {
    try {
      const {
        overwrite = true,
        createParentDirs = true,
        encoding = this.defaultEncoding,
      } = options;

      // Check if file exists
      if (!overwrite && (await this.fileExists(path))) {
        return {
          path,
          success: false,
          error: 'File already exists and overwrite is disabled',
        };
      }

      // Create parent directories if needed
      if (createParentDirs) {
        await this.ensureDirectory(dirname(path));
      }

      // Write the file
      await fs.writeFile(path, content, { encoding });

      return { path, success: true };
    } catch (error) {
      return {
        path,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Write multiple files in a batch
   */
  async writeMultipleFiles(
    files: Array<{ relativePath: string; content: string }>,
    options: WriteMultipleFilesOptions
  ): Promise<FileWriteResult[]> {
    const { baseDir, overwrite = true, createParentDirs = true } = options;

    const results: FileWriteResult[] = [];

    for (const file of files) {
      const fullPath = join(baseDir, file.relativePath);
      const result = await this.writeFile(fullPath, file.content, {
        overwrite,
        createParentDirs,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Read a file from disk
   */
  async readFile(
    path: string,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<string> {
    try {
      return await fs.readFile(path, { encoding });
    } catch (error) {
      throw new Error(
        `Failed to read file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDirectory(path: string): Promise<void> {
    try {
      await fs.mkdir(path, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create directory ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      throw new Error(
        `Failed to list files in ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      await fs.unlink(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copy a file
   */
  async copyFile(sourcePath: string, destPath: string): Promise<FileWriteResult> {
    try {
      await this.ensureDirectory(dirname(destPath));
      await fs.copyFile(sourcePath, destPath);
      return { path: destPath, success: true };
    } catch (error) {
      return {
        path: destPath,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
