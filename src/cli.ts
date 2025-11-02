#!/usr/bin/env node

import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';
import { runAdvisor } from './advisor-agent.js';
import { InterviewStateManager } from './lib/interview/state-manager.js';
import { AgentGenerationPipeline } from './pipeline.js';
import { listSessions, loadSession as loadPersistedSession, saveSession } from './lib/interview/persistence.js';

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

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 advisor> ',
    });

    this.sessionManager = new InterviewStateManager();
    this.pipeline = new AgentGenerationPipeline();

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

        console.log(`\n📂 Resumed session from ${metadata.lastActivity.toLocaleString()}`);
        console.log(`   Messages: ${metadata.messageCount}, Started: ${metadata.conversationStarted.toLocaleString()}\n`);
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
        await this.saveSession(args[0]);
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
    try {
      // Capture output by intercepting console writes
      const capturedChunks: string[] = [];
      const originalWrite = process.stdout.write.bind(process.stdout);

      // Override stdout.write to capture output
      process.stdout.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
        const text = chunk.toString();
        capturedChunks.push(text);
        return originalWrite(chunk, encoding, callback);
      }) as typeof process.stdout.write;

      try {
        // Call runAdvisor with session tracking
        const result = await runAdvisor(
          query,
          this.currentAdvisorSessionId
            ? { sessionId: this.currentAdvisorSessionId }
            : { continueSession: false }
        );

        // Restore original write
        process.stdout.write = originalWrite;

        // Update session tracking
        if (result.sessionId) {
          this.currentAdvisorSessionId = result.sessionId;
          this.conversationMessageCount++;

          if (!this.conversationStartTime) {
            this.conversationStartTime = new Date();
          }

          // Update conversation metadata in session manager
          const metadata = this.sessionManager.getConversationMetadata();
          this.sessionManager.updateConversationMetadata({
            advisorSessionId: result.sessionId,
            messageCount: this.conversationMessageCount,
            lastActivity: new Date(),
            conversationStarted: this.conversationStartTime
          });

          // Persist the updated state
          await this.persistConversationState();
        }

        // Save captured output
        this.lastOutput = capturedChunks.join('');
        this.outputHistory.push(this.lastOutput);

        // Check for code fences and provide copy tips
        if (this.lastOutput.includes('```')) {
          console.log('\n' + '─'.repeat(60));
          console.log('💡 Tip: Code blocks detected in the output above!');
          console.log('   • Copy the code from each code fence');
          console.log('   • Use /save <filename> to save this output to a Markdown file');
          console.log('─'.repeat(60) + '\n');
        }
      } catch (innerError) {
        // Restore original write on error
        process.stdout.write = originalWrite;
        throw innerError;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Check if this is the "disabled" stub error
      if (errorMessage.includes('disabled') || errorMessage.includes('SDK API')) {
        console.log(
          '\n⚠️  Streaming mode unavailable; using batch pipeline instead.\n'
        );
        await this.handleBatchMode(query);
      } else {
        console.error('❌ Error:', errorMessage);
      }
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

      // For MVP, create a minimal requirements object from the query
      // In production, this would run through the full interview
      const minimalResponses: Record<string, any> = {
        agentName: 'MyAgent',
        primaryPurpose: initialQuery,
        targetAudience: 'developers',
        preferredInteractionStyle: 'conversational',
        outputRequirements: 'Generated code and configuration',
      };

      console.log('🔄 Running pipeline with minimal configuration...\n');

      const result = await this.pipeline.runFullPipeline(minimalResponses, {
        verboseLogging: true,
        outputDir: './output',
      });

      console.log('\n✅ Pipeline complete!\n');

      if (result.generatedFiles) {
        console.log('📁 Generated files in ./output/:');
        console.log(`   • Agent code: agent.ts`);
        console.log(`   • System prompt: system-prompt.txt`);
        console.log(`   • Configuration: agent-config.json`);
        console.log(`   • Package file: package.json`);
        console.log(`   • Environment: .env.example`);
        console.log(`   • README: README.md\n`);
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
  /save <filename>   Save last advisor output to a Markdown file
  /load [name]       Load a saved session
  /status            Show current pipeline status
  /templates         List available agent templates

OUTPUT CAPTURE:
  The CLI automatically captures all advisor responses. When the advisor
  generates code or configuration files, you'll see a tip message with
  instructions to save the output.

  Example workflow:
    1. Ask: "I want to build a data analysis agent"
    2. Advisor generates code with Markdown formatting
    3. Use: /save my-agent.md
    4. Copy code blocks from the saved file

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

  /**
   * Save last output to markdown file
   */
  private async saveSession(filename?: string): Promise<void> {
    if (!filename) {
      console.log('Usage: /save <filename>');
      console.log('Example: /save my-agent-output.md');
      return;
    }

    if (!this.lastOutput) {
      console.log('❌ No output to save. Run a query first.');
      return;
    }

    try {
      // Add .md extension if not present
      const outputFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
      const outputPath = path.resolve(process.cwd(), outputFilename);

      // Write the last output to file
      await fs.writeFile(outputPath, this.lastOutput, 'utf-8');

      console.log(`\n💾 Output saved to: ${outputPath}`);
      console.log(`📄 File size: ${(this.lastOutput.length / 1024).toFixed(2)} KB\n`);
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

        console.log(`\n✅ Session loaded: ${name}`);
        console.log(`   Messages: ${metadata.messageCount}`);
        console.log(`   Started: ${metadata.conversationStarted.toLocaleString()}`);
        console.log(`   Last activity: ${metadata.lastActivity.toLocaleString()}\n`);
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
║              🤖  Agent Advisor CLI v1.0.0                ║
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
  const cli = new AdvisorCLI();
  cli.start();
} else {
  // Single query mode
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
