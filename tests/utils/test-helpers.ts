/**
 * Test Utilities and Helpers
 *
 * Provides factory functions, mocks, and utilities for testing.
 * These helpers enable isolated, repeatable testing across the suite.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as ts from 'typescript';
import { InterviewState } from '../../src/types/interview.js';
import { AgentRequirements, AgentRecommendations } from '../../src/types/agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Factory function to create mock InterviewState objects with defaults.
 *
 * @param overrides - Partial InterviewState to override defaults
 * @returns Complete InterviewState with reasonable defaults + overrides
 */
export function createMockInterviewState(
  overrides: Partial<InterviewState> = {}
): InterviewState {
  const defaultState: InterviewState = {
    sessionId: `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    currentStage: 'discovery',
    currentQuestionIndex: 0,
    responses: [],
    requirements: {
      name: '',
      description: '',
      primaryOutcome: '',
      targetAudience: [],
      interactionStyle: 'task-focused',
      deliveryChannels: [],
      successMetrics: [],
      capabilities: {
        memory: 'none',
        fileAccess: false,
        webAccess: false,
        codeExecution: false,
        dataAnalysis: false,
        toolIntegrations: []
      },
      environment: {
        runtime: 'local'
      }
    },
    recommendations: null,
    isComplete: false
  };

  return { ...defaultState, ...overrides };
}

/**
 * Factory function to create mock AgentRequirements with defaults.
 *
 * @param overrides - Partial AgentRequirements to override defaults
 * @returns Complete AgentRequirements
 */
export function createMockAgentRequirements(
  overrides: Partial<AgentRequirements> = {}
): AgentRequirements {
  const defaultRequirements: AgentRequirements = {
    name: 'Test Agent',
    description: 'A test agent for unit testing',
    primaryOutcome: 'Test primary outcome',
    targetAudience: ['Test users'],
    interactionStyle: 'task-focused',
    deliveryChannels: ['CLI'],
    successMetrics: ['Test metric'],
    capabilities: {
      memory: 'none',
      fileAccess: false,
      webAccess: false,
      codeExecution: false,
      dataAnalysis: false,
      toolIntegrations: []
    },
    environment: {
      runtime: 'local'
    }
  };

  return { ...defaultRequirements, ...overrides };
}

/**
 * Factory function to create mock AgentRecommendations.
 *
 * @param templateId - The template ID to recommend
 * @param requirements - The requirements to base recommendations on
 * @returns Mock AgentRecommendations
 */
export function createMockAgentRecommendations(
  templateId: string,
  requirements: AgentRequirements
): AgentRecommendations {
  return {
    agentType: templateId,
    requiredDependencies: [
      '@anthropic-ai/claude-agent-sdk',
      'zod',
      'dotenv'
    ],
    mcpServers: requirements.capabilities.fileAccess ? [
      { name: 'filesystem', description: 'File system access', url: 'mcp://filesystem', authentication: 'none' as const }
    ] : [],
    systemPrompt: `You are ${requirements.name}, designed to ${requirements.primaryOutcome}.`,
    starterCode: '',
    toolConfigurations: [],
    estimatedComplexity: 'medium' as const,
    implementationSteps: [
      'Install dependencies',
      'Configure environment',
      'Implement tools',
      'Test agent',
      'Deploy'
    ]
  };
}

/**
 * Creates a temporary directory for file I/O tests.
 *
 * @param prefix - Optional prefix for the temp directory name
 * @returns Promise resolving to the absolute path of the temp directory
 */
export async function createTempDirectory(prefix: string = 'test'): Promise<string> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tempDir = path.join(__dirname, '../../test-temp', `${prefix}-${uniqueSuffix}`);
  await fs.mkdir(tempDir, { recursive: true });
  // Verify directory is fully created and accessible
  await fs.access(tempDir);
  // Small delay to ensure file system is ready
  await new Promise(resolve => setTimeout(resolve, 50));
  return tempDir;
}

/**
 * Removes a temporary test directory and all its contents.
 * Implements retry logic to handle file system delays and race conditions.
 *
 * @param dirPath - Absolute path to the directory to remove
 */
export async function cleanupTempDirectory(dirPath: string): Promise<void> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Check if directory exists first
      await fs.access(dirPath);

      // Wait a bit to ensure all file handles are closed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Attempt cleanup
      await fs.rm(dirPath, { recursive: true, force: true });

      // Verify cleanup succeeded
      try {
        await fs.access(dirPath);
        // Directory still exists, retry
        if (attempt < maxAttempts - 1) continue;
      } catch {
        // Directory successfully removed
        return;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist, cleanup successful
        return;
      }

      // Other error, retry if attempts remain
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }

      // Final attempt failed, log warning
      console.warn(`Failed to cleanup temp directory ${dirPath} after ${maxAttempts} attempts:`, error);
    }
  }
}

/**
 * Creates an in-memory mock for FileWriter operations.
 *
 * @returns Object with mock file system methods and call tracking
 */
export function mockFileSystem() {
  const files = new Map<string, string>();
  const calls: { method: string; args: any[] }[] = [];

  return {
    files,
    calls,
    writeFile: async (filePath: string, content: string) => {
      calls.push({ method: 'writeFile', args: [filePath, content] });
      files.set(filePath, content);
      return { success: true, path: filePath };
    },
    readFile: async (filePath: string) => {
      calls.push({ method: 'readFile', args: [filePath] });
      const content = files.get(filePath);
      if (content === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return content;
    },
    fileExists: async (filePath: string) => {
      calls.push({ method: 'fileExists', args: [filePath] });
      return files.has(filePath);
    },
    deleteFile: async (filePath: string) => {
      calls.push({ method: 'deleteFile', args: [filePath] });
      const existed = files.has(filePath);
      files.delete(filePath);
      return existed;
    },
    listFiles: async (dirPath: string) => {
      calls.push({ method: 'listFiles', args: [dirPath] });
      const filesInDir: string[] = [];
      for (const [filePath] of files) {
        if (filePath.startsWith(dirPath)) {
          filesInDir.push(path.basename(filePath));
        }
      }
      return filesInDir;
    },
    reset: () => {
      files.clear();
      calls.length = 0;
    }
  };
}

/**
 * Programmatically validates that TypeScript code compiles.
 *
 * @param code - The TypeScript code to validate
 * @param compilerOptions - Optional TypeScript compiler options
 * @returns Validation result with errors and warnings
 */
export function validateTypeScriptCode(
  code: string,
  compilerOptions?: ts.CompilerOptions
): { valid: boolean; errors: string[]; warnings: string[] } {
  const defaultOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmit: true,
    ...compilerOptions
  };

  // Create a virtual source file
  const sourceFile = ts.createSourceFile(
    'test.ts',
    code,
    ts.ScriptTarget.ES2022,
    true
  );

  // Create a compiler host
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName) => {
      if (fileName === 'test.ts') {
        return sourceFile;
      }
      // For other files, try to get them from the real file system
      const libPath = path.join(__dirname, '../../node_modules/typescript/lib', fileName);
      try {
        const content = require('fs').readFileSync(libPath, 'utf8');
        return ts.createSourceFile(fileName, content, ts.ScriptTarget.ES2022, true);
      } catch {
        return undefined;
      }
    },
    writeFile: () => {}, // No-op for validation
    getCurrentDirectory: () => process.cwd(),
    getDirectories: () => [],
    fileExists: (fileName) => fileName === 'test.ts',
    readFile: (fileName) => fileName === 'test.ts' ? code : undefined,
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options)
  };

  // Create program and get diagnostics
  const program = ts.createProgram(['test.ts'], defaultOptions, compilerHost);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  const errors: string[] = [];
  const warnings: string[] = [];

  diagnostics.forEach((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(message);
    } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
      warnings.push(message);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Extracts tool names from generated agent code.
 *
 * @param code - The generated TypeScript code
 * @returns Array of tool names found in the code
 */
export function extractToolNames(code: string): string[] {
  const toolNames: string[] = [];

  // Match tool constant declarations like: export const readCsvTool = { name: 'read_csv', ... }
  const toolConstPattern = /export\s+const\s+(\w+Tool)\s*=/g;
  let match;

  while ((match = toolConstPattern.exec(code)) !== null) {
    toolNames.push(match[1]);
  }

  // Also match tool name strings in the tool definitions
  const toolNamePattern = /name:\s*['"]([a-z_]+)['"]/g;
  const nameMatches: string[] = [];

  while ((match = toolNamePattern.exec(code)) !== null) {
    nameMatches.push(match[1]);
  }

  return nameMatches.length > 0 ? nameMatches : toolNames;
}

/**
 * Counts non-empty, non-comment lines of code.
 *
 * @param code - The code to analyze
 * @returns Number of effective lines of code
 */
export function countLinesOfCode(code: string): number {
  const lines = code.split('\n');
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comment-only lines
    if (trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      count++;
    }
  }

  return count;
}

/**
 * Validates JSON structure by attempting to parse it.
 *
 * @param jsonString - The JSON string to validate
 * @returns Object with validation result and parsed data if valid
 */
export function validateJSON(jsonString: string): { valid: boolean; data?: any; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

/**
 * Creates a mock timestamp for consistent testing.
 *
 * @param offsetMs - Optional millisecond offset from now
 * @returns Date object
 */
export function createMockTimestamp(offsetMs: number = 0): Date {
  return new Date(Date.now() + offsetMs);
}

/**
 * Waits for a specified duration (useful for async tests).
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensures file operations execute sequentially with delays between them.
 * Useful for tests that create multiple files and need to avoid race conditions.
 *
 * @param operations - Array of async operations to execute
 * @param delayBetween - Delay in milliseconds between operations (default: 50ms)
 * @returns Promise resolving to array of operation results
 */
export async function ensureSequentialFileOps<T>(
  operations: Array<() => Promise<T>>,
  delayBetween: number = 50
): Promise<T[]> {
  const results: T[] = [];
  for (const op of operations) {
    results.push(await op());
    await new Promise(resolve => setTimeout(resolve, delayBetween));
  }
  return results;
}

/**
 * Waits for a file to exist with retry logic.
 * Handles file system lag by polling until the file becomes accessible.
 *
 * @param filePath - Path to the file to check
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 1000ms)
 * @returns Promise resolving to true if file exists, false if timeout reached
 */
export async function waitForFileExists(
  filePath: string,
  timeoutMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  return false;
}

/**
 * Compiles TypeScript code in a temporary directory with real module resolution.
 * This provides more realistic validation than the virtual host approach.
 *
 * @param code - The TypeScript code to compile
 * @param extraCompilerOptions - Additional compiler options to merge
 * @returns Validation result with errors and warnings
 */
export async function compileTypeScriptInTempDir(
  code: string,
  extraCompilerOptions?: ts.CompilerOptions
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const tempDir = await createTempDirectory('ts-validate');

  try {
    // Write source file
    const sourceFile = path.join(tempDir, 'index.ts');
    await fs.writeFile(sourceFile, code);

    // Write tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2022'],
        types: ['node'],
        esModuleInterop: true,
        allowJs: false,
        strict: false, // Allow any types for simplicity
        skipLibCheck: true,
        noEmit: true,
        ...extraCompilerOptions
      },
      include: ['index.ts']
    };
    await fs.writeFile(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    // Parse config file
    const configPath = path.join(tempDir, 'tsconfig.json');
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      return {
        valid: false,
        errors: [ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')],
        warnings: []
      };
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      tempDir
    );

    // Create program and get diagnostics
    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    const errors: string[] = [];
    const warnings: string[] = [];

    diagnostics.forEach((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        errors.push(message);
      } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
        warnings.push(message);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } finally {
    // Cleanup temp directory
    await cleanupTempDirectory(tempDir);
  }
}
