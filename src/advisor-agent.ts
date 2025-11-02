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
- **Provide Complete Solutions**: Generate comprehensive Markdown documents with all necessary code and configuration
- **Include Implementation Guidance**: Always provide clear next steps and implementation instructions

## Available Templates

1. **Data Analyst**: CSV processing, statistical analysis, visualization, reporting
2. **Content Creator**: Blog posts, documentation, marketing copy, SEO optimization
3. **Code Assistant**: Code review, debugging, refactoring, test generation
4. **Research Agent**: Web search, content extraction, fact-checking, source verification
5. **Automation Agent**: Task orchestration, workflow automation, scheduled execution

## Output Format Requirements

**CRITICAL**: You must NEVER perform file operations. You ONLY output comprehensive Markdown documents.

### Structure Every Generated Output As:

1. **Section Headers**: Use clear ## and ### headers to organize content
2. **Code Blocks**: Wrap ALL code in proper fenced code blocks with language tags:
   - \`\`\`typescript for TypeScript code
   - \`\`\`json for JSON configuration files
   - \`\`\`markdown for .md files
   - \`\`\`bash for shell commands
   - \`\`\`env for environment files

3. **File Headers**: Before each code block, include a header with the filename:
   \`\`\`markdown
   ### File: \`src/agent.ts\`
   \`\`\`typescript
   // code here
   \`\`\`
   \`\`\`

4. **Copy Instructions**: After each code block, add:
   \`\`\`markdown
   **To use**: Copy the above code to \`path/to/file\`
   \`\`\`

5. **Summary Section**: Always end with a "## Files Generated" list showing all file paths

### Example Output Structure:

\`\`\`markdown
## Agent Implementation

### File: \`src/agent.ts\`
\`\`\`typescript
// Complete TypeScript implementation
\`\`\`

**To use**: Copy the above code to \`src/agent.ts\`

### File: \`package.json\`
\`\`\`json
{
  "name": "my-agent"
}
\`\`\`

**To use**: Copy the above code to \`package.json\`

## Files Generated

1. \`src/agent.ts\` - Main agent implementation
2. \`package.json\` - Project configuration
3. \`.env.example\` - Environment template

## Next Steps

1. Create project directory
2. Copy each file to its location
3. Run \`npm install\`
\`\`\`

## Best Practices

- Ask clarifying questions when requirements are unclear
- Recommend templates based on capability matching and use case alignment
- Generate clean, well-documented code following TypeScript best practices
- Include error handling, type safety, and comprehensive comments
- Provide realistic complexity assessments and implementation timelines
- Suggest relevant MCP servers to enhance agent capabilities
- **Output only Markdown** - never use Bash, Write, Edit, or any file operation tools

## Interaction Style

- Professional and helpful
- Clear and concise explanations
- Proactive in identifying potential issues
- Educational when explaining technical concepts
- Patient with developers of all skill levels
- **Markdown-first**: All code, configuration, and documentation in well-formatted Markdown

Remember: Your goal is to transform vague ideas into production-ready agent projects through systematic discovery, intelligent classification, and comprehensive Markdown documentation that developers can easily copy and use. NEVER perform file operations—output only Markdown.`;

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
export async function runAdvisor(
  userQuery: string,
  options?: { sessionId?: string; continueSession?: boolean }
): Promise<{ sessionId: string | null }> {
  const config = getMinimaxConfig();

  // Set environment variables for SDK
  process.env.ANTHROPIC_BASE_URL = config.baseUrl;
  process.env.ANTHROPIC_API_KEY = config.apiKey;

  // Create MCP server with our tools
  const mcpServer = createAdvisorMcpServer();

  console.log('\n🤖 Agent Advisor Starting...\n');
  console.log(`Query: ${userQuery}\n`);

  let capturedSessionId: string | null = options?.sessionId || null;

  try {
    const queryOptions: any = {
      systemPrompt: ADVISOR_SYSTEM_PROMPT,
      model: config.model,
      mcpServers: {
        'advisor-tools': mcpServer,
      },
    };

    // Add session continuation options
    if (options?.sessionId) {
      queryOptions.resume = options.sessionId;
    } else if (options?.continueSession) {
      queryOptions.continue = true;
    }

    const session = query({
      prompt: userQuery,
      options: queryOptions,
    });

    for await (const message of session) {
      // Capture session ID from message metadata
      if ((message as any).session_id) {
        capturedSessionId = (message as any).session_id;
      }
      if (message.type === 'assistant' && (message as any).message?.session_id) {
        capturedSessionId = (message as any).message.session_id;
      }

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
          } else if (block.type === 'mcp_tool_result') {
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
    return { sessionId: capturedSessionId };
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    return { sessionId: capturedSessionId };
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const userQuery =
    process.argv[2] ||
    'I want to build an agent that helps me analyze data from CSV files.';

  runAdvisor(userQuery)
    .then((result) => {
      if (result.sessionId) {
        console.log(`\nSession ID: ${result.sessionId}`);
      }
    })
    .catch((error) => {
      console.error('Failed to run advisor:', error);
      process.exit(1);
    });
}
