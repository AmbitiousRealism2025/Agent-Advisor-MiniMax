import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { getMinimaxConfig } from './utils/minimax-config.js';
import { createInterviewTool } from './lib/interview/tool-handler.js';
import { createClassifyAgentTypeTool } from './lib/classification/tool-handler.js';
import {
  createGenerateAgentCodeTool,
  createGenerateSystemPromptTool,
  createGenerateConfigFilesTool,
} from './lib/generation/tool-handlers.js';
import { createGenerateImplementationGuideTool } from './lib/export/tool-handler.js';

/**
 * System prompt for the advisor agent
 */
const ADVISOR_SYSTEM_PROMPT = `You are an expert AI Agent Advisor specializing in helping developers create Claude Agent SDK projects that integrate with the MiniMax API.

## Your Role

You guide developers through a structured workflow to build custom AI agents:

1. **Interview Phase**: Conduct a comprehensive interview using the ask_interview_question tool to understand the developer's needs, target users, and technical requirements.

2. **Classification Phase**: Analyze the gathered requirements using the classify_agent_type tool to recommend the most suitable agent template from our library (Data Analyst, Content Creator, Code Assistant, Research Agent, or Automation Agent).

3. **Generation Phase**: Create production-ready code, system prompts, and configuration files using:
   - generate_agent_code: Complete TypeScript implementation
   - generate_system_prompt: Customized agent instructions
   - generate_config_files: Project configuration (package.json, tsconfig.json, .env, etc.)
   - generate_implementation_guide: Detailed setup and deployment guide

## Workflow Guidelines

- **Start with Interview**: Always begin by initializing an interview session to gather comprehensive requirements
- **Be Thorough**: Ask all 15 interview questions across 4 stages (discovery, requirements, architecture, output)
- **Validate Requirements**: Ensure you have complete information before classification
- **Explain Recommendations**: When presenting template recommendations, clearly explain why each template was chosen and the confidence scores
- **Provide Complete Solutions**: Generate all necessary files for a working agent project
- **Include Implementation Guidance**: Always provide clear next steps and implementation instructions

## Available Templates

1. **Data Analyst**: CSV processing, statistical analysis, visualization, reporting
2. **Content Creator**: Blog posts, documentation, marketing copy, SEO optimization
3. **Code Assistant**: Code review, debugging, refactoring, test generation
4. **Research Agent**: Web search, content extraction, fact-checking, source verification
5. **Automation Agent**: Task orchestration, workflow automation, scheduled execution

## Best Practices

- Ask clarifying questions when requirements are unclear
- Recommend templates based on capability matching and use case alignment
- Generate clean, well-documented code following TypeScript best practices
- Include error handling, type safety, and comprehensive comments
- Provide realistic complexity assessments and implementation timelines
- Suggest relevant MCP servers to enhance agent capabilities

## Interaction Style

- Professional and helpful
- Clear and concise explanations
- Proactive in identifying potential issues
- Educational when explaining technical concepts
- Patient with developers of all skill levels

Remember: Your goal is to transform vague ideas into production-ready agent projects through systematic discovery, intelligent classification, and comprehensive code generation.`;

/**
 * Create and configure the advisor agent MCP server
 */
export function createAdvisorMcpServer() {
  return createSdkMcpServer({
    name: 'advisor-tools',
    tools: [
      createInterviewTool(),
      createClassifyAgentTypeTool(),
      createGenerateAgentCodeTool(),
      createGenerateSystemPromptTool(),
      createGenerateConfigFilesTool(),
      createGenerateImplementationGuideTool(),
    ],
  });
}

/**
 * Run the advisor agent with a user query
 */
export async function runAdvisor(userQuery: string): Promise<void> {
  const config = getMinimaxConfig();

  // Set environment variables for SDK
  process.env.ANTHROPIC_BASE_URL = config.baseUrl;
  process.env.ANTHROPIC_API_KEY = config.apiKey;

  // Create MCP server with our tools
  const mcpServer = createAdvisorMcpServer();

  console.log('\n🤖 Agent Advisor Starting...\n');
  console.log(`Query: ${userQuery}\n`);

  try {
    const session = query({
      prompt: userQuery,
      options: {
        systemPrompt: ADVISOR_SYSTEM_PROMPT,
        model: config.model,
        mcpServers: {
          'advisor-tools': mcpServer,
        },
      },
    });

    for await (const message of session) {
      // Handle streaming events (thinking blocks, deltas)
      if (message.type === 'stream_event' && message.event) {
        const event = message.event;

        // Handle content_block_start events (thinking, tool_use, tool_result start)
        if (event.type === 'content_block_start' && event.content_block) {
          const block = event.content_block;

          if (block.type === 'thinking') {
            const thinkingText = (block as any).thinking || '';
            const truncated = thinkingText.length > 80
              ? thinkingText.substring(0, 77) + '...'
              : thinkingText;
            console.log(`\n[Thinking] ${truncated}`);
          } else if (block.type === 'mcp_tool_result' || block.type === 'code_execution_tool_result' ||
                     block.type === 'bash_code_execution_tool_result' || block.type === 'web_search_tool_result' ||
                     block.type === 'web_fetch_tool_result') {
            // Tool result started - log brief status
            const hasError = (block as any).is_error || (block as any).error;
            const status = hasError ? '❌ error' : '✓ success';
            console.log(`\n[Tool Result] ${status}`);
          }
        }

        // Handle content_block_delta events (streaming thinking text)
        if (event.type === 'content_block_delta' && event.delta) {
          const delta = event.delta;

          if (delta.type === 'thinking_delta') {
            const thinkingText = (delta as any).thinking || '';
            if (thinkingText.length > 0) {
              const truncated = thinkingText.length > 80
                ? thinkingText.substring(0, 77) + '...'
                : thinkingText;
              console.log(`\n[Thinking] ${truncated}`);
            }
          }
        }
      }

      // Handle assistant messages
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            process.stdout.write(block.text);
          } else if (block.type === 'tool_use') {
            console.log(`\n\n🔧 Using tool: ${block.name}`);
            // Optionally show input (but keep brief)
            if (block.input && typeof block.input === 'object') {
              const keys = Object.keys(block.input);
              if (keys.length > 0) {
                console.log(`   Parameters: ${keys.join(', ')}`);
              }
            }
          } else if (block.type === 'thinking') {
            // Final thinking block in assistant message (not streamed)
            const thinkingText = (block as any).thinking || '';
            const truncated = thinkingText.length > 80
              ? thinkingText.substring(0, 77) + '...'
              : thinkingText;
            console.log(`\n[Thinking] ${truncated}`);
          }
        }
      }

      // Handle errors
      if ('error' in message && message.error) {
        console.error(`\n❌ Error: ${(message as any).error}`);
      }
    }

    console.log('\n\n✨ Agent Advisor Complete\n');
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    throw error;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const userQuery =
    process.argv[2] ||
    'I want to build an agent that helps me analyze data from CSV files.';

  runAdvisor(userQuery).catch((error) => {
    console.error('Failed to run advisor:', error);
    process.exit(1);
  });
}
