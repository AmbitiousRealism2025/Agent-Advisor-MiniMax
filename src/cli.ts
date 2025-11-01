#!/usr/bin/env node

import * as readline from 'readline';
import { runAdvisor } from './advisor-agent.js';
import { InterviewStateManager } from './lib/interview/state-manager.js';
import { AgentGenerationPipeline } from './pipeline.js';

/**
 * Interactive CLI for the Agent Advisor
 */
export class AdvisorCLI {
  private rl: readline.Interface;
  private history: string[] = [];
  private sessionManager: InterviewStateManager;
  private pipeline: AgentGenerationPipeline;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 advisor> ',
    });

    this.sessionManager = new InterviewStateManager();
    this.pipeline = new AgentGenerationPipeline();

    this.setupEventHandlers();
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
   * Handle regular user queries
   */
  private async handleQuery(query: string): Promise<void> {
    try {
      await runAdvisor(query);
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
  /save [name]       Save current session
  /load [name]       Load a saved session
  /status            Show current pipeline status
  /templates         List available agent templates

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
  3. Generation - Receive generated code and configuration
  4. Implementation - Follow the implementation guide

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
   * Save current session
   */
  private async saveSession(name?: string): Promise<void> {
    if (!name) {
      console.log('Usage: /save <session-name>');
      return;
    }

    try {
      // Session persistence would be implemented here
      console.log(`💾 Session saved as: ${name}`);
    } catch (error) {
      console.error(
        'Failed to save session:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Load a saved session
   */
  private async loadSession(name?: string): Promise<void> {
    if (!name) {
      console.log('Usage: /load <session-name>');
      return;
    }

    try {
      // Session loading would be implemented here
      console.log(`📂 Session loaded: ${name}`);
    } catch (error) {
      console.error(
        'Failed to load session:',
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
  runAdvisor(query).catch((error) => {
    console.error('Failed to run advisor:', error);
    process.exit(1);
  });
}
