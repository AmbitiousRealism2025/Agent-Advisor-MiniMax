#!/usr/bin/env node

// Load environment variables first (must be before other imports that use process.env)
import 'dotenv/config';

import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createRequire } from 'node:module';
import { runAdvisor } from './advisor-agent.js';
import { InterviewStateManager } from './lib/interview/state-manager.js';
import { AgentGenerationPipeline } from './pipeline.js';
import { listSessions, loadSession as loadPersistedSession, saveSession } from './lib/interview/persistence.js';
import { applyMinimaxEnvironment, getMinimaxConfig } from './utils/minimax-config.js';

const require = createRequire(import.meta.url);

const CLI_VERSION = (() => {
  try {
    const pkg = require('../../package.json') as { version?: string };
    return typeof pkg?.version === 'string' ? pkg.version : 'dev';
  } catch {
    return 'dev';
  }
})();

/**
 * Parse CLEAR_SCREEN environment variable
 * Accepts: true/false, 1/0, yes/no (case-insensitive)
 * Defaults to true
 */
function shouldClearScreen(): boolean {
  const value = process.env.CLEAR_SCREEN?.toLowerCase().trim();

  if (!value) {
    return true; // Default to true
  }

  // Accept true/false, 1/0, yes/no
  if (value === 'false' || value === '0' || value === 'no') {
    return false;
  }

  return true; // Default to true for any other value
}

let minimaxEnvironmentConfigured = false;

/**
 * Ensure the Claude SDK environment variables are populated exactly once per process.
 * The SDK reads `ANTHROPIC_*` values from `process.env`, so we map the validated
 * MiniMax configuration to those keys ahead of the first query.
 */
function ensureMinimaxEnvironment(): void {
  if (minimaxEnvironmentConfigured) {
    return;
  }

  try {
    const config = getMinimaxConfig();
    applyMinimaxEnvironment(config);
    minimaxEnvironmentConfigured = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown MiniMax configuration error.';
    console.error('❌ MiniMax configuration error:');
    console.error(`   • ${message}`);
    process.exit(1);
  }
}

/**
 * Interactive CLI for the Agent Advisor
 */
export class AdvisorCLI {
  private rl: readline.Interface;
  private history: string[] = [];
  private sessionManager: InterviewStateManager;
  private pipeline: AgentGenerationPipeline;
  private lastOutput: string = '';
  private outputHistory: string[] = [];
  private currentAdvisorSessionId: string | null = null;
  private conversationMessageCount: number = 0;
  private conversationStartTime: Date | null = null;
  private clearScreen: boolean;
  private isBusy = false;
  private pendingConfirmation: ((value: string) => void) | null = null;

  constructor(clearScreen?: boolean) {
    ensureMinimaxEnvironment();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 advisor> ',
    });

    this.sessionManager = new InterviewStateManager();
    this.pipeline = new AgentGenerationPipeline();
    this.clearScreen = clearScreen ?? shouldClearScreen();

    this.setupEventHandlers();
    this.attemptSessionResume();
  }

  /**
   * Attempt to resume the most recent session
   */
  private async attemptSessionResume(): Promise<void> {
    try {
      const sessions = await listSessions();
      if (sessions.length === 0) {
        return;
      }

      // Get the most recent session
      const mostRecent = sessions[0];
      const state = await loadPersistedSession(mostRecent.sessionId);

      if (!state) {
        return;
      }

      // Load the session state
      this.sessionManager.loadState(state);

      // Restore conversation metadata
      const metadata = this.sessionManager.getConversationMetadata();
      if (metadata) {
        this.currentAdvisorSessionId = metadata.advisorSessionId;
        this.conversationMessageCount = metadata.messageCount;
        this.conversationStartTime = metadata.conversationStarted;

        // Guard against missing fields (legacy sessions may not have full metadata)
        const lastActivity = metadata.lastActivity ? metadata.lastActivity.toLocaleString() : 'unknown';
        const startTime = metadata.conversationStarted ? metadata.conversationStarted.toLocaleString() : 'unknown';

        console.log(`\n📂 Resumed session from ${lastActivity}`);
        console.log(`   Messages: ${metadata.messageCount}, Started: ${startTime}\n`);
      }
    } catch (error) {
      // Silently fail - session resume is optional
      console.log('Note: Could not resume previous session');
    }
  }

  /**
   * Persist conversation state to session
   */
  private async persistConversationState(): Promise<void> {
    try {
      const state = this.sessionManager.getState();
      await saveSession(state);
    } catch (error) {
      console.error('Warning: Failed to persist conversation state:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Setup readline event handlers
   */
  private setupEventHandlers(): void {
    this.rl.on('line', async (line: string) => {
      if (this.pendingConfirmation) {
        const resolver = this.pendingConfirmation;
        this.pendingConfirmation = null;
        resolver(line);
        return;
      }

      const input = line.trim();

      if (!input) {
        this.rl.prompt();
        return;
      }

      this.history.push(input);

      // Handle special commands
      if (input.startsWith('/')) {
        await this.handleCommand(input);
      } else {
        // Regular query - run through agent
        await this.handleQuery(input);
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }

  /**
   * Handle special CLI commands
   */
  private async handleCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.slice(1).split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;

      case 'exit':
      case 'quit':
        this.rl.close();
        break;

      case 'clear':
        console.clear();
        break;

      case 'history':
        this.showHistory();
        break;

      case 'save':
        await this.saveWithDirectorySelection();
        break;

      case 'load':
        await this.loadSession(args[0]);
        break;

      case 'status':
        this.showStatus();
        break;

      case 'templates':
        this.showTemplates();
        break;

      default:
        console.log(`Unknown command: ${cmd}`);
        console.log('Type /help for available commands');
    }
  }

  /**
   * Handle regular user queries with output capture
   */
  private async handleQuery(query: string): Promise<void> {
    if (this.isBusy) {
      console.log('\n⚠️  A query is already in progress. Please wait for it to finish before sending another.\n');
      return;
    }

    this.isBusy = true;
    this.rl.pause();

    const capturedChunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    let capturingStdout = false;

    try {
      process.stdout.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
        const text = chunk.toString();
        capturedChunks.push(text);
        return originalWrite(chunk, encoding, callback);
      }) as typeof process.stdout.write;

      capturingStdout = true;

      try {
        const result = await runAdvisor(
          query,
          this.currentAdvisorSessionId
            ? { sessionId: this.currentAdvisorSessionId }
            : { continueSession: false }
        );

        if (result.sessionId) {
          this.currentAdvisorSessionId = result.sessionId;
          this.conversationMessageCount++;

          if (!this.conversationStartTime) {
            this.conversationStartTime = new Date();
          }

          this.sessionManager.updateConversationMetadata({
            advisorSessionId: result.sessionId,
            messageCount: this.conversationMessageCount,
            lastActivity: new Date(),
            conversationStarted: this.conversationStartTime
          });

          await this.persistConversationState();
        }

        this.lastOutput = capturedChunks.join('');
        this.outputHistory.push(this.lastOutput);

        if (this.lastOutput.includes('```')) {
          console.log('\n' + '─'.repeat(60));
          console.log('💡 Tip: Code blocks detected in the output above!');
          console.log('   • Copy the code from each code fence');
          console.log('   • Use /save to save this output to a Markdown file');
          console.log('─'.repeat(60) + '\n');
        }
      } catch (error) {
        if (capturingStdout) {
          process.stdout.write = originalWrite;
          capturingStdout = false;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('disabled') || errorMessage.includes('SDK API')) {
          console.log(
            '\n⚠️  Streaming mode unavailable; using batch pipeline instead.\n'
          );
          await this.handleBatchMode(query);
        } else {
          console.error('❌ Error:', errorMessage);
        }
      } finally {
        if (capturingStdout) {
          process.stdout.write = originalWrite;
          capturingStdout = false;
        }
      }
    } finally {
      this.isBusy = false;
      this.rl.resume();
    }
  }

  /**
   * Fallback batch mode when streaming is unavailable
   */
  private async handleBatchMode(initialQuery: string): Promise<void> {
    try {
      console.log(
        '\n📋 Starting batch pipeline - simplified workflow for testing\n'
      );

      // Create minimal responses using valid interview question IDs
      // These IDs match the updateRequirementsFromResponse() cases in state-manager.ts
      const minimalResponses: Record<string, any> = {
        q1_agent_name: 'MyAgent',
        q2_primary_outcome: initialQuery,
        q3_target_audience: ['developers'],
        q4_interaction_style: 'conversational',
        q5_delivery_channels: ['cli'],
        q6_success_metrics: ['accuracy', 'speed'],
        q7_memory_needs: 'short-term',
        q8_file_access: false,
        q9_web_access: false,
        q10_code_execution: false,
        q11_data_analysis: false,
        q12_tool_integrations: '',
        q13_runtime_preference: 'local',
        q14_constraints: '',
        q15_additional_notes: 'Batch mode test execution',
      };

      console.log('🔄 Running pipeline with minimal configuration...\n');

      const result = await this.pipeline.runFullPipeline(minimalResponses, {
        verboseLogging: true,
      });

      console.log('\n✅ Pipeline complete!\n');

      if (result.planningDocument) {
        console.log('📁 Generated planning document preview:\n');
        const preview = result.planningDocument.split('\n').slice(0, 12).join('\n');
        console.log(preview);
        console.log('\n   • Full document available via generate_planning_document tool.\n');
      }

      if (result.recommendations) {
        console.log(
          `📊 Recommended template: ${result.recommendations.agentType}`
        );
        console.log(
          `🔧 Complexity: ${result.recommendations.estimatedComplexity}\n`
        );
      }
    } catch (error) {
      console.error(
        '\n❌ Batch pipeline error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│                   Agent Advisor CLI Help                     │
└─────────────────────────────────────────────────────────────┘

COMMANDS:
  /help              Show this help message
  /exit, /quit       Exit the CLI
  /clear             Clear the screen
  /history           Show command history
  /save              Save last advisor output to a Markdown file (interactive)
  /load [name]       Load a saved session
  /status            Show current pipeline status
  /templates         List available agent templates

CLI OPTIONS:
  --no-clear         Disable console clearing on startup (preserves terminal history)

  Console Clearing Precedence (highest to lowest):
    1. --no-clear flag (runtime override)
    2. CLEAR_SCREEN environment variable (session preference)
    3. Default behavior (clear screen = true)

  Examples:
    npm run cli                    # Default (clear screen)
    npm run cli -- --no-clear      # Preserve terminal history
    CLEAR_SCREEN=false npm run cli # Disable via environment

OUTPUT CAPTURE:
  The CLI automatically captures all advisor responses. When the advisor
  generates code or configuration files, you'll see a tip message with
  instructions to save the output.

  Example workflow:
    1. Ask: "I want to build a data analysis agent"
    2. Advisor generates code with Markdown formatting
    3. Use: /save (interactive directory and filename selection)
    4. Copy code blocks from the saved file

ENVIRONMENT VARIABLES:
  MAX_MESSAGE_LENGTH  Thinking block truncation length (default: 300, range: 50-1000)
  CLEAR_SCREEN        Clear console on startup (default: true, accepts: true/false/1/0/yes/no)

  See .env.example for complete configuration options.

USAGE:
  Simply type your request and press Enter. The advisor will guide
  you through creating a custom agent.

  Examples:
    "I want to build a data analysis agent"
    "Help me create an automation agent for scheduling tasks"
    "I need an agent that can review code and suggest improvements"

WORKFLOW:
  1. Interview - Answer questions about your requirements
  2. Classification - Get template recommendations
  3. Generation - Receive generated code and configuration (as Markdown)
  4. Save Output - Use /save to write Markdown to disk
  5. Implementation - Copy code from Markdown and follow guide

For more information, visit: https://github.com/anthropics/agent-advisor
`);
  }

  /**
   * Show command history
   */
  private showHistory(): void {
    if (this.history.length === 0) {
      console.log('No command history');
      return;
    }

    console.log('\nCommand History:');
    this.history.forEach((cmd, idx) => {
      console.log(`  ${idx + 1}. ${cmd}`);
    });
    console.log();
  }

  private async confirmAction(message: string): Promise<boolean> {
    if (this.pendingConfirmation) {
      throw new Error('Another confirmation prompt is already pending.');
    }

    console.log(`${message} (y/N)`);

    return new Promise<boolean>((resolve) => {
      this.pendingConfirmation = (value: string) => {
        const normalized = value.trim().toLowerCase();
        resolve(normalized === 'y' || normalized === 'yes');
      };
    });
  }

  /**
   * Generic prompt helper for user input
   */
  private async prompt(message: string): Promise<string> {
    if (this.pendingConfirmation) {
      throw new Error('Another prompt is already pending.');
    }

    console.log(message);

    return new Promise<string>((resolve) => {
      this.pendingConfirmation = (value: string) => {
        resolve(value.trim());
      };
    });
  }

  /**
   * List directories in the specified path
   */
  private async listDirectories(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const hiddenAndExcludedDirs = new Set(['node_modules', 'dist', 'build', '.git', 'sessions']);

      return entries
        .filter((entry) => {
          if (!entry.isDirectory()) return false;
          if (entry.name.startsWith('.')) return false;
          if (hiddenAndExcludedDirs.has(entry.name)) return false;
          return true;
        })
        .map((entry) => entry.name)
        .sort();
    } catch (error) {
      console.error('Failed to list directories:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Create a new directory with sanitized name
   */
  private async createNewDirectory(baseDir: string, name: string): Promise<string> {
    // Sanitize the directory name
    let sanitized = name.trim();

    // Replace spaces with hyphens
    sanitized = sanitized.replace(/\s+/g, '-');

    // Remove invalid characters (keep only alphanumeric, hyphens, underscores)
    sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');

    // Strip leading/trailing dots and hyphens
    sanitized = sanitized.replace(/^[.-]+|[.-]+$/g, '');

    // Clamp length to reasonable bounds (1-100 characters)
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    if (!sanitized || sanitized.length === 0) {
      throw new Error('Invalid directory name after sanitization');
    }

    const newDirPath = path.join(baseDir, sanitized);

    try {
      await fs.mkdir(newDirPath, { recursive: true });
      return newDirPath;
    } catch (error) {
      // Handle already-exists case gracefully
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
        console.log(`   Directory already exists: ${sanitized}`);
        return newDirPath;
      }
      throw error;
    }
  }

  /**
   * Interactive directory selection
   */
  private async selectDirectory(): Promise<string> {
    const baseDir = process.cwd();
    const directories = await this.listDirectories(baseDir);

    console.log('\n📁 Select a directory to save the file:');
    console.log('  1. Use current directory (.)');
    console.log('  2. Create new directory');
    console.log('  3. Enter custom path');

    if (directories.length > 0) {
      console.log('\n  Available directories:');
      directories.forEach((dir, idx) => {
        console.log(`  ${idx + 4}. ${dir}/`);
      });
    }

    const choice = await this.prompt('\nEnter your choice (number):');
    const choiceNum = parseInt(choice, 10);

    if (choiceNum === 1) {
      return baseDir;
    } else if (choiceNum === 2) {
      const dirName = await this.prompt('Enter new directory name:');
      return await this.createNewDirectory(baseDir, dirName);
    } else if (choiceNum === 3) {
      const customPath = await this.prompt('Enter custom path:');
      const resolvedPath = path.resolve(baseDir, customPath);

      // Ensure directory exists
      await fs.mkdir(resolvedPath, { recursive: true });
      return resolvedPath;
    } else if (choiceNum >= 4 && choiceNum < 4 + directories.length) {
      const selectedDir = directories[choiceNum - 4];
      return path.join(baseDir, selectedDir);
    } else {
      console.log('Invalid choice, using current directory');
      return baseDir;
    }
  }

  /**
   * Save last output with interactive directory selection
   */
  private async saveWithDirectorySelection(): Promise<void> {
    if (!this.lastOutput) {
      console.log('❌ No output to save. Run a query first.');
      return;
    }

    try {
      // Select directory interactively
      const selectedDir = await this.selectDirectory();

      // Generate default filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const defaultFilename = `advisor-output-${timestamp}.md`;

      // Prompt for filename
      const filenameInput = await this.prompt(`\nEnter filename (default: ${defaultFilename}):`);
      let filename = filenameInput || defaultFilename;

      // Append .md if missing
      if (!filename.endsWith('.md')) {
        filename = `${filename}.md`;
      }

      const resolvedOutputPath = path.join(selectedDir, filename);

      // Path safety validation
      const baseDirectory = process.cwd();
      const normalizedPath = path.normalize(resolvedOutputPath);
      const hasTraversal = normalizedPath.split(path.sep).some((segment) => segment === '..');
      const escapesBase = path.relative(baseDirectory, resolvedOutputPath).startsWith('..');
      const isAbsolutePath = path.isAbsolute(filename);

      if (isAbsolutePath || hasTraversal || escapesBase) {
        console.log('⚠️  The specified path resolves to a location outside the project directory:');
        console.log(`   ${resolvedOutputPath}`);
        const confirmed = await this.confirmAction('Proceed with saving to this location?');
        if (!confirmed) {
          console.log('Save cancelled.');
          return;
        }
      }

      // Check if file exists
      try {
        await fs.access(resolvedOutputPath);
        const overwriteConfirmed = await this.confirmAction(`File already exists at ${resolvedOutputPath}. Overwrite?`);
        if (!overwriteConfirmed) {
          console.log('Save cancelled.');
          return;
        }
      } catch {
        // File does not exist; continue
      }

      // Write the file
      await fs.writeFile(resolvedOutputPath, this.lastOutput, 'utf-8');

      // Show success feedback
      console.log(`\n✅ Output saved successfully!`);
      console.log(`   Path: ${resolvedOutputPath}`);
      console.log(`   Size: ${(this.lastOutput.length / 1024).toFixed(2)} KB\n`);
    } catch (error) {
      console.error(
        '❌ Failed to save output:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Load a saved session
   */
  private async loadSession(name?: string): Promise<void> {
    if (!name) {
      // List available sessions
      const sessions = await listSessions();
      if (sessions.length === 0) {
        console.log('No saved sessions available');
        return;
      }

      console.log('\nAvailable sessions:');
      sessions.slice(0, 10).forEach((session, idx) => {
        console.log(`  ${idx + 1}. ${session.sessionId} (${session.timestamp.toLocaleString()})`);
      });
      console.log('\nUsage: /load <session-id>');
      return;
    }

    try {
      // Load the specified session
      const state = await loadPersistedSession(name);
      if (!state) {
        console.log(`❌ Session not found: ${name}`);
        return;
      }

      // Load state into session manager
      this.sessionManager.loadState(state);

      // Restore conversation metadata
      const metadata = this.sessionManager.getConversationMetadata();
      if (metadata) {
        this.currentAdvisorSessionId = metadata.advisorSessionId;
        this.conversationMessageCount = metadata.messageCount;
        this.conversationStartTime = metadata.conversationStarted;

        // Guard against missing fields (legacy sessions may not have full metadata)
        const startTime = metadata.conversationStarted ? metadata.conversationStarted.toLocaleString() : 'unknown';
        const lastActivity = metadata.lastActivity ? metadata.lastActivity.toLocaleString() : 'unknown';

        console.log(`\n✅ Session loaded: ${name}`);
        console.log(`   Messages: ${metadata.messageCount}`);
        console.log(`   Started: ${startTime}`);
        console.log(`   Last activity: ${lastActivity}\n`);
      } else {
        console.log(`\n✅ Session loaded: ${name} (legacy session without metadata)\n`);
      }

      // Persist immediately to refresh timestamps
      await this.persistConversationState();
    } catch (error) {
      console.error(
        '❌ Failed to load session:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Show current pipeline status
   */
  private showStatus(): void {
    const state = this.pipeline.getState();
    console.log(`
Current Pipeline Status:
  Session Active: ${state.sessionActive ? 'Yes' : 'No'}
  Current Stage: ${state.currentStage || 'None'}
  Progress: ${state.progress.toFixed(1)}%
`);
  }

  /**
   * Show available templates
   */
  private showTemplates(): void {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│                  Available Agent Templates                   │
└─────────────────────────────────────────────────────────────┘

1. Data Analyst Agent
   • CSV data processing and analysis
   • Statistical analysis and visualization
   • Report generation in multiple formats

2. Content Creator Agent
   • Blog posts and documentation
   • Marketing copy and SEO optimization
   • Multi-platform content formatting

3. Code Assistant Agent
   • Code review and quality analysis
   • Bug detection and refactoring
   • Test generation and best practices

4. Research Agent
   • Web search and content extraction
   • Fact-checking and source verification
   • Comprehensive research reports

5. Automation Agent
   • Task scheduling and orchestration
   • Workflow automation
   • Queue management and monitoring

The advisor will recommend the best template based on your requirements.
`);
  }

  /**
   * Show welcome message
   */
  private showWelcome(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              🤖  Agent Advisor CLI v${CLI_VERSION}                ║
║                                                           ║
║    Create production-ready Claude Agent SDK projects     ║
║           powered by MiniMax API integration              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Type /help for available commands or start with a request like:
  "I want to build a data analysis agent"

`);
  }

  /**
   * Start the interactive CLI
   */
  start(): void {
    // Clear screen on startup if configured and in TTY
    if (this.clearScreen && process.stdout.isTTY) {
      console.clear();
    }

    this.showWelcome();
    this.rl.prompt();
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
const isInteractive =
  args.includes('--interactive') || args.includes('-i') || args.length === 0;

if (isInteractive) {
  // Interactive mode
  const noClear = args.includes('--no-clear');
  const clearScreen = noClear ? false : shouldClearScreen();
  const cli = new AdvisorCLI(clearScreen);
  cli.start();
} else {
  // Single query mode
  ensureMinimaxEnvironment();
  const query = args.join(' ');
  runAdvisor(query)
    .then((result) => {
      if (result.sessionId) {
        console.log(`\n📋 Session ID: ${result.sessionId}`);
      }
    })
    .catch((error) => {
      console.error('Failed to run advisor:', error);
      process.exit(1);
    });
}
