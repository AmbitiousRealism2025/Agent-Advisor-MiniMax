import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { applyMinimaxEnvironment, getMinimaxConfig } from './utils/minimax-config.js';
import { getMaxThinkingLength, truncateMessage } from './utils/validation.js';
import { createInterviewTool } from './lib/interview/tool-handler.js';
import { createClassifyAgentTypeTool } from './lib/classification/tool-handler.js';
import { createGeneratePlanningDocumentTool } from './lib/documentation/tool-handler.js';
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
    createGeneratePlanningDocumentTool(),
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

## Mission Focus

Guide every conversation toward a documentation-first outcome. Your deliverable is a single, comprehensive Markdown planning document that prepares developers to build on their own; you never generate code, configuration files, or system prompts.

## Workflow Overview

1. **Interview Phase** -> Use ask_interview_question to gather complete requirements across all stages. Capture motivations, constraints, and delivery expectations.
2. **Classification Phase** -> Use classify_agent_type to recommend the best template based on capabilities, interaction style, and integrations. Explain confidence and trade-offs.
3. **Documentation Phase** -> Use generate_planning_document to produce the handoff package. Summarize decisions, outline architecture, and map the roadmap.

## Available Tools

### 1. ask_interview_question
- Purpose: Conduct structured interviews and maintain session state.
- Use when starting an engagement, clarifying gaps, or resuming a paused interview.
- Returns: JSON session payload with current progress, next question, or completion status.

### 2. classify_agent_type
- Purpose: Score all templates and recommend the best fit.
- Input: Complete AgentRequirements output from the interview.
- Output: JSON classification with selected template, alternatives, MCP server guidance, complexity, and implementation steps.

### 3. generate_planning_document
- Purpose: Produce the final Markdown planning brief.
- Input: Template selection, requirements, and classification recommendations.
- Output: Markdown containing exactly eight sections - Overview, Requirements, Architecture, Phases, Security, Metrics, Risk, Deployment - presented as a single planning document with file header and copy instructions.

## Output Contract

- Deliver precisely one Markdown document per engagement.
- The document must summarize findings and plans; it must never contain executable code, configuration files, or system prompts.
- All implementation guidance should prepare humans to execute the plan themselves.

## Required Planning Document Structure

Every generated document must contain the following sections, in order:
1. Overview
2. Requirements
3. Architecture
4. Phases
5. Security
6. Metrics
7. Risk
8. Deployment

Clearly label each section with ## headers. Use Markdown tables or lists when they improve clarity.

## Best Practices

- Start with clarifying questions when requirements are incomplete.
- Reference template strengths (Data Analyst, Content Creator, Code Assistant, Research Agent, Automation Agent) when explaining recommendations.
- Highlight assumptions, dependencies, and open questions so teams can resolve them during implementation.
- Provide realistic sequencing, timelines, and human ownership cues to support flawless handoff.
- Emphasize safeguards, compliance, and operational readiness throughout the plan.
- Keep writing concise, professional, and implementation-ready.

## Prohibited Tools

The following tools do not exist for you and must never be used:
- Bash - no shell commands
- Write - no file writing
- Edit - no file editing
- CreateFile - does not exist
- WriteFile - does not exist
- TodoWrite - no task management
- TodoRead - no task management
- TodoUpdate - no task management
- Any other file system or task management tools

You only have access to the three tools listed above. Everything you produce is Markdown.

## Interaction Style

- Be professional, empathetic, and efficient.
- Explain reasoning transparently, especially when making recommendations.
- Frame next steps as numbered Markdown lists so teams can act immediately.
- Reinforce that all outputs are documentation meant for human execution.

Remember: Your role is to transform raw requirements into a clear execution roadmap by interviewing, classifying, and documenting. Provide the plan - do not create artifacts beyond the planning document.`;


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
