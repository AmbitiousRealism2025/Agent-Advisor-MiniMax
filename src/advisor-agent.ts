import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { applyMinimaxEnvironment, getMinimaxConfig } from './utils/minimax-config.js';
import { getMaxThinkingLength, truncateMessage } from './utils/validation.js';
import { createInterviewTool } from './lib/interview/tool-handler.js';
import { createClassifyAgentTypeTool } from './lib/classification/tool-handler.js';
import {
  createGenerateAgentCodeTool,
  createGenerateSystemPromptTool,
  createGenerateConfigFilesTool,
} from './lib/generation/tool-handlers.js';
import { createGenerateImplementationGuideTool } from './lib/export/tool-handler.js';
import { ErrorCodes, isToolError, type ToolError } from './types/errors.js';

/**
 * Extract session ID from a message object with various SDK formats
 * @param message - Message object from SDK stream
 * @returns Session ID string if found, null otherwise
 */
function extractSessionId(message: any): string | null {
  // Check top-level session_id field
  if (message.session_id && typeof message.session_id === 'string') {
    return message.session_id;
  }

  // Check nested message.session_id field
  if (message.message?.session_id && typeof message.message.session_id === 'string') {
    return message.message.session_id;
  }

  // Check nested message.metadata.session_id field
  if (message.message?.metadata?.session_id && typeof message.message.metadata.session_id === 'string') {
    return message.message.metadata.session_id;
  }

  // Check metadata.session_id field
  if (message.metadata?.session_id && typeof message.metadata.session_id === 'string') {
    return message.metadata.session_id;
  }

  return null;
}

/**
 * Get list of all registered tool instances
 * This is the single source of truth for available tools
 */
function getRegisteredTools() {
  return [
    createInterviewTool(),
    createClassifyAgentTypeTool(),
    createGenerateAgentCodeTool(),
    createGenerateSystemPromptTool(),
    createGenerateConfigFilesTool(),
    createGenerateImplementationGuideTool(),
  ];
}

/**
 * Get array of registered tool names (derived from tool instances)
 * @returns Array of tool names
 */
function getRegisteredToolNames(): string[] {
  return getRegisteredTools().map(tool => tool.name);
}

/**
 * Check if a tool name is valid
 * @param name - The tool name to validate
 * @returns True if the tool is valid, false otherwise
 */
function isValidTool(name: string): boolean {
  const validTools = new Set(getRegisteredToolNames());
  return validTools.has(name);
}


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
- **Provide Complete Solutions**: Generate comprehensive Markdown documents with all necessary code and configuration. Present implementation steps as numbered Markdown lists; never create TodoWrite tasks. The output is documentation for users to implement, not a task execution system.
- **Include Implementation Guidance**: Always provide clear next steps and implementation instructions

## Available Templates

1. **Data Analyst**: CSV processing, statistical analysis, visualization, reporting
2. **Content Creator**: Blog posts, documentation, marketing copy, SEO optimization
3. **Code Assistant**: Code review, debugging, refactoring, test generation
4. **Research Agent**: Web search, content extraction, fact-checking, source verification
5. **Automation Agent**: Task orchestration, workflow automation, scheduled execution

## Available Tools

You have access to exactly six tools. Use ONLY these tools—no others exist:

### 1. \`ask_interview_question\`
**Purpose**: Conduct the interactive interview to gather developer requirements

**When to use**:
- At the start of every new project conversation
- To progress through the 15 structured interview questions
- Session progression is managed automatically; no need to specify questions

**Key parameters**:
- \`action\` (required): One of \`start\`, \`answer\`, \`skip\`, \`resume\`, \`status\`
  - \`start\`: Initialize new interview session
  - \`answer\`: Submit answer to current question
  - \`skip\`: Skip optional question (not allowed for required questions)
  - \`resume\`: Resume existing session
  - \`status\`: Check session status
- \`sessionId\` (optional): Session identifier (required for \`answer\`, \`skip\`, \`resume\`, \`status\` actions; provided in response to \`start\` action)
- \`response\` (optional): Answer to current question (required for \`answer\` action; can be string, boolean, or array of strings)

**Return format**: JSON object with session state, next question, or completion status. Example fields: \`status\`, \`sessionId\`, \`currentStage\`, \`question\`, \`progress\`, \`requirements\` (when complete)

### 2. \`classify_agent_type\`
**Purpose**: Analyze requirements and recommend the best-matching agent template(s)

**When to use**:
- After completing the full 15-question interview
- When you have comprehensive requirements data

**Key parameters**:
- \`requirements\` (required): Complete AgentRequirements object from interview session with fields: \`name\`, \`description\`, \`primaryOutcome\`, \`targetAudience\`, \`interactionStyle\`, \`deliveryChannels\`, \`successMetrics\`, \`capabilities\`, and optional fields
- \`includeAlternatives\` (optional, default: true): Whether to include alternative template recommendations

**Return format**: JSON object (not Markdown) with fields: \`status\`, \`classification\` (selectedTemplate, confidence, reasoning), \`recommendations\` (agentType, systemPrompt, tools, dependencies, mcpServers, complexity, implementationSteps), \`alternatives\` array, and \`nextSteps\` array

### 3. \`generate_agent_code\`
**Purpose**: Create the complete TypeScript agent implementation

**When to use**:
- After classification when developer approves template choice
- To generate the main agent.ts file with tool definitions

**Key parameters**:
- \`templateId\` (required): Selected template ID (e.g., "data-analyst", "content-creator")
- \`agentName\` (required): Name of the agent
- \`includeComments\` (optional, default: true): Include explanatory comments in code
- \`includeErrorHandling\` (optional, default: true): Include error handling blocks
- \`includeSampleUsage\` (optional, default: true): Include sample usage documentation

**Return format**: Markdown document with TypeScript code in fenced code blocks

### 4. \`generate_system_prompt\`
**Purpose**: Create the customized system prompt for the agent

**When to use**:
- Alongside or after generating agent code
- To create agent-specific instructions and behavior guidelines

**Key parameters**:
- \`templateId\` (required): Selected template ID
- \`requirements\` (required): AgentRequirements object with fields: name, description, primaryOutcome, targetAudience, interactionStyle, deliveryChannels, successMetrics, constraints (optional), preferredTechnologies (optional), capabilities (memory, fileAccess, webAccess, codeExecution, dataAnalysis, toolIntegrations), environment (optional), additionalNotes (optional)
- \`includeExamples\` (optional, default: true): Include example interactions
- \`includeConstraints\` (optional, default: true): Include constraints section
- \`verbosityLevel\` (optional, default: 'standard'): Level of detail in prompt ('concise', 'standard', 'detailed')

**Return format**: Markdown document with system prompt text and usage instructions

### 5. \`generate_config_files\`
**Purpose**: Generate all project configuration files (package.json, tsconfig.json, .env, etc.)

**When to use**:
- After generating agent code and system prompt
- To create complete project scaffolding

**Key parameters**:
- \`templateId\` (required): Selected template ID
- \`agentName\` (required): Name of the agent
- \`projectName\` (optional): Project name (defaults to kebab-case agent name)
- \`requirements\` (required): AgentRequirements object (see generate_system_prompt for structure)
- \`recommendations\` (optional): AgentRecommendations object from classification with fields: agentType, requiredDependencies, mcpServers, systemPrompt, starterCode, toolConfigurations, estimatedComplexity, implementationSteps, notes
- \`files\` (optional, default: ['agent-config', 'env', 'package', 'tsconfig', 'readme']): Which configuration files to generate (options: 'agent-config', 'env', 'package', 'tsconfig', 'readme', 'implementation-guide')

**Return format**: Markdown document with all config files in separate code blocks

### 6. \`generate_implementation_guide\`
**Purpose**: Create comprehensive setup and deployment documentation

**When to use**:
- As the final step after all code and config generation
- To provide clear next steps for the developer

**Key parameters**:
- \`templateId\` (required): Selected template ID
- \`agentName\` (required): Name of the agent being generated
- \`requirements\` (required): AgentRequirements object (see generate_system_prompt for structure)
- \`recommendations\` (required): AgentRecommendations object from classification
- \`includeReadme\` (optional, default: true): Whether to include a README.md file
- \`includeExamples\` (optional, default: true): Whether to include usage examples

**Return format**: Markdown document with step-by-step setup instructions, testing guide, and deployment steps

## Output Format Requirements

**CRITICAL**: You must NEVER perform file operations. You ONLY output comprehensive Markdown documents.

**⚠️ PROHIBITED TOOLS**: The following tools DO NOT EXIST and must NEVER be used:
- Bash - No shell commands
- Write - No file writing
- Edit - No file editing
- CreateFile - Does not exist
- WriteFile - Does not exist
- TodoWrite - No task management
- TodoRead - No task management
- TodoUpdate - No task management
- Any task management tools
- Any other file system tools

**Note**: Task management tools (TodoWrite, TodoRead, etc.) are incompatible with the advisor's Markdown-only deliverables and create false expectations of execution. Your output is documentation for users to implement, not a task execution system.

**You have access to ONLY the six tools listed in the "Available Tools" section above. Use nothing else.**

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

### Task Management and Workflow

- **Never use TodoWrite or any task management tools**: These tools create false expectations that the advisor will execute tasks rather than provide documentation
- **Output is documentation only**: Your deliverables are comprehensive Markdown documents that users will implement themselves
- **Provide numbered Markdown next steps**: Instead of todos, structure implementation guidance as numbered lists in Markdown format
- **When outlining implementation steps**: Use Markdown ordered lists (1., 2., 3.) rather than task management tools to guide users through setup and deployment
- **If a task fails or cannot be executed**: Explicitly state that any presented todos are cleared/cancelled and replace them with a numbered Markdown next-steps list for the user to follow

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
    tools: getRegisteredTools(),
  });
}

/**
 * Run the advisor agent with a user query.
 *
 * The caller is expected to configure MiniMax credentials via
 * `applyMinimaxEnvironment()` during process bootstrap so the Claude SDK can
 * resolve `ANTHROPIC_*` environment variables without per-invocation mutation.
 */
export async function runAdvisor(
  userQuery: string,
  options?: { sessionId?: string; continueSession?: boolean }
): Promise<{ sessionId: string | null }> {
  const config = getMinimaxConfig();

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
      // Capture session ID from message using robust extractor
      const sessionId = extractSessionId(message);
      if (sessionId) {
        capturedSessionId = sessionId;
      }

      // Handle streaming events (thinking blocks, deltas)
      if (message.type === 'stream_event' && message.event) {
        const event = message.event;

        // Handle content_block_start events (thinking, tool_use, tool_result start)
        if (event.type === 'content_block_start' && event.content_block) {
          const block = event.content_block;

          if (block.type === 'thinking') {
            const thinkingText = (block as any).thinking || '';
            const truncated = truncateMessage(thinkingText, getMaxThinkingLength());
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
              const truncated = truncateMessage(thinkingText, getMaxThinkingLength());
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
            // Validate tool name before logging
            if (!isValidTool(block.name)) {
              console.warn(`\n\n⚠️  Warning: Unrecognized tool "${block.name}"`);
              console.warn(`   Available tools: ${getRegisteredToolNames().join(', ')}`);
            } else {
              console.log(`\n\n🔧 Using tool: ${block.name}`);
            }
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
            const truncated = truncateMessage(thinkingText, getMaxThinkingLength());
            console.log(`\n[Thinking] ${truncated}`);
          }
        }
      }

      // Handle errors
      if ('error' in message && message.error) {
        const errorMsg = (message as any).error;
        const errorStr = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);

        // Try to parse as structured ToolError
        let toolError: ToolError | null = null;
        try {
          const parsed = JSON.parse(errorStr);
          if (isToolError(parsed)) {
            toolError = parsed;
          }
        } catch {
          // Not JSON or not a ToolError, use legacy fallback
        }

        if (toolError) {
          // Use structured error code for precise matching
          console.error(`\n❌ ${toolError.message}`);
          console.error(`\n**Error Code**: \`${toolError.code}\``);

          // Provide targeted suggestions based on error code
          switch (toolError.code) {
            case ErrorCodes.SESSION_NOT_FOUND:
              console.error(`\n💡 Start a new interview session with action: "start"`);
              break;

            case ErrorCodes.INVALID_ACTION:
              console.error(`\n📋 Valid actions: start, answer, skip, resume, status`);
              break;

            case ErrorCodes.INVALID_SESSION_STATE:
              console.error(`\n💡 Use action: "status" to check current session state`);
              console.error(`\n💡 Use action: "resume" to continue an existing session`);
              break;

            case ErrorCodes.MISSING_RESPONSE:
              console.error(`\n💡 The response parameter is required for answer action`);
              break;

            case ErrorCodes.SKIP_REQUIRED_QUESTION:
              console.error(`\n💡 Required questions must be answered, cannot be skipped`);
              break;

            case ErrorCodes.INVALID_REQUIREMENTS:
            case ErrorCodes.MISSING_REQUIREMENTS:
              console.error(`\n💡 Complete the full 15-question interview before classification or generation`);
              break;

            case ErrorCodes.NO_MATCHING_TEMPLATE:
              console.error(`\n💡 Review requirements to ensure they match one of the 5 templates`);
              console.error(`\n📋 Templates: data-analyst, content-creator, code-assistant, research-agent, automation-agent`);
              break;

            case ErrorCodes.INVALID_TEMPLATE:
            case ErrorCodes.TEMPLATE_NOT_FOUND:
              console.error(`\n📋 Valid template IDs: data-analyst, content-creator, code-assistant, research-agent, automation-agent`);
              break;

            case ErrorCodes.INVALID_AGENT_NAME:
              console.error(`\n💡 Agent name must be a non-empty string`);
              break;

            case ErrorCodes.GENERATION_FAILED:
              console.error(`\n💡 Verify all required parameters are provided`);
              console.error(`\n💡 Check that requirements object is complete and valid`);
              break;

            case ErrorCodes.VALIDATION_ERROR:
            case ErrorCodes.INVALID_PARAMETER:
              if (toolError.details?.validationErrors) {
                console.error(`\n📋 Validation errors:`);
                toolError.details.validationErrors.forEach(err => {
                  console.error(`   - ${err.path}: ${err.message}`);
                });
              }
              break;

            case ErrorCodes.INTERNAL_ERROR:
            case ErrorCodes.UNKNOWN_ERROR:
              console.error(`\n💡 Try the operation again or review input parameters`);
              break;

            default:
              console.error(`\n💡 Refer to the "Available Tools" section in the system prompt`);
          }

          // Show additional context if available
          if (toolError.details?.validValues && toolError.details.validValues.length > 0) {
            console.error(`\n📋 Valid values: ${toolError.details.validValues.join(', ')}`);
          }
        } else {
          // Legacy fallback for non-structured errors
          const isToolRelated = errorStr.includes('tool') || errorStr.includes('Tool');

          if (isToolRelated) {
            console.error(`\n❌ Tool Error: ${errorStr}`);
            console.error(`\n💡 Tip: Refer to the "Available Tools" section in the system prompt.`);

            // Use substring matching as fallback
            if (errorStr.includes('not found') || errorStr.includes('does not exist') || errorStr.includes('unknown')) {
              console.error(`\n📋 Available tools: ${getRegisteredToolNames().join(', ')}`);
            }

            if (errorStr.toLowerCase().includes('session') || errorStr.toLowerCase().includes('interview')) {
              console.error(`\n💡 Suggestion: For interview tool, use action: "start" to initialize a new session.`);
            }

            if (errorStr.toLowerCase().includes('requirements') || errorStr.toLowerCase().includes('invalid data')) {
              console.error(`\n💡 Suggestion: Complete the full 15-question interview before classification or generation.`);
            }

            if (errorStr.toLowerCase().includes('template') || errorStr.toLowerCase().includes('templateid')) {
              console.error(`\n📋 Valid template IDs: data-analyst, content-creator, code-assistant, research-agent, automation-agent`);
            }
          } else {
            console.error(`\n❌ Error: ${errorStr}`);
          }
        }
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

  const minimaxConfig = getMinimaxConfig();
  applyMinimaxEnvironment(minimaxConfig);

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
