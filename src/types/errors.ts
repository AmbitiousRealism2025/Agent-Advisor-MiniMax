/**
 * Error codes for tool operations
 *
 * These codes enable reliable error detection and provide targeted
 * suggestions without fragile substring matching.
 */
export const ErrorCodes = {
  // Interview tool errors
  INVALID_ACTION: 'INVALID_ACTION',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  INVALID_SESSION_STATE: 'INVALID_SESSION_STATE',
  MISSING_RESPONSE: 'MISSING_RESPONSE',
  SKIP_REQUIRED_QUESTION: 'SKIP_REQUIRED_QUESTION',

  // Classification tool errors
  INVALID_REQUIREMENTS: 'INVALID_REQUIREMENTS',
  MISSING_REQUIREMENTS: 'MISSING_REQUIREMENTS',
  NO_MATCHING_TEMPLATE: 'NO_MATCHING_TEMPLATE',

  // Generation tool errors
  INVALID_TEMPLATE: 'INVALID_TEMPLATE',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  INVALID_AGENT_NAME: 'INVALID_AGENT_NAME',
  GENERATION_FAILED: 'GENERATION_FAILED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Structured error payload for tool operations
 */
export interface ToolError {
  code: ErrorCode;
  message: string;
  details?: {
    field?: string;
    validationErrors?: Array<{ path: string; message: string }>;
    validValues?: string[];
    context?: Record<string, any>;
  };
}

/**
 * Create a structured tool error
 */
export function createToolError(
  code: ErrorCode,
  message: string,
  details?: ToolError['details']
): ToolError {
  return { code, message, details };
}

/**
 * Check if an error is a tool error
 */
export function isToolError(error: unknown): error is ToolError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as any).code === 'string' &&
    typeof (error as any).message === 'string'
  );
}

/**
 * Format tool error as Markdown
 */
export function formatToolErrorAsMarkdown(error: ToolError): string {
  let markdown = `## Error

${error.message}

**Error Code**: \`${error.code}\`
`;

  if (error.details) {
    markdown += '\n### Error Details\n\n';

    if (error.details.field) {
      markdown += `**Field**: \`${error.details.field}\`\n\n`;
    }

    if (error.details.validationErrors && error.details.validationErrors.length > 0) {
      markdown += '**Validation Errors**:\n';
      error.details.validationErrors.forEach(err => {
        markdown += `- ${err.path}: ${err.message}\n`;
      });
      markdown += '\n';
    }

    if (error.details.validValues && error.details.validValues.length > 0) {
      markdown += `**Valid Values**: ${error.details.validValues.map(v => `\`${v}\``).join(', ')}\n\n`;
    }

    if (error.details.context) {
      markdown += '**Additional Context**:\n```json\n';
      markdown += JSON.stringify(error.details.context, null, 2);
      markdown += '\n```\n\n';
    }
  }

  // Add troubleshooting section based on error code
  markdown += getTroubleshootingTips(error.code);

  return markdown;
}

/**
 * Get troubleshooting tips based on error code
 */
function getTroubleshootingTips(code: ErrorCode): string {
  const tips: Record<ErrorCode, string> = {
    [ErrorCodes.INVALID_ACTION]: `### Troubleshooting

- Valid actions are: \`start\`, \`answer\`, \`skip\`, \`resume\`, \`status\`
- Check spelling and use lowercase
- Ensure action matches interview workflow state
`,
    [ErrorCodes.SESSION_NOT_FOUND]: `### Troubleshooting

- Start a new interview session with \`action: "start"\`
- Verify the sessionId is correct
- Check if the session expired (sessions last 24 hours)
`,
    [ErrorCodes.INVALID_SESSION_STATE]: `### Troubleshooting

- Use \`action: "status"\` to check current session state
- Cannot answer questions after interview completion
- Resume existing session with \`action: "resume"\`
`,
    [ErrorCodes.MISSING_RESPONSE]: `### Troubleshooting

- The \`response\` parameter is required for \`answer\` action
- Provide a valid response (string, boolean, or array of strings)
- Check the question type to provide appropriate response format
`,
    [ErrorCodes.SKIP_REQUIRED_QUESTION]: `### Troubleshooting

- Only optional questions can be skipped
- Required questions must be answered
- Use \`action: "answer"\` with a valid response
`,
    [ErrorCodes.INVALID_REQUIREMENTS]: `### Troubleshooting

- Ensure all required fields are present: name, description, primaryOutcome, targetAudience, interactionStyle, deliveryChannels, successMetrics, capabilities
- Check that capabilities object has required fields: memory, fileAccess, webAccess, codeExecution, dataAnalysis, toolIntegrations
- Validate enum fields: interactionStyle must be 'conversational', 'task-focused', or 'collaborative'
`,
    [ErrorCodes.MISSING_REQUIREMENTS]: `### Troubleshooting

- Complete the full 15-question interview before classification
- Use \`ask_interview_question\` tool with \`action: "start"\` to begin
- Verify all required questions have been answered
`,
    [ErrorCodes.NO_MATCHING_TEMPLATE]: `### Troubleshooting

- Review requirements to ensure they match one of the 5 templates
- Templates: data-analyst, content-creator, code-assistant, research-agent, automation-agent
- Consider adjusting capabilities or use cases to better align with available templates
`,
    [ErrorCodes.INVALID_TEMPLATE]: `### Troubleshooting

- Valid template IDs: data-analyst, content-creator, code-assistant, research-agent, automation-agent
- Check spelling and use lowercase with hyphens
- Use the template ID returned by \`classify_agent_type\` tool
`,
    [ErrorCodes.TEMPLATE_NOT_FOUND]: `### Troubleshooting

- Verify template ID is one of: data-analyst, content-creator, code-assistant, research-agent, automation-agent
- Template IDs are case-sensitive and use kebab-case
- Consult classification results for recommended template
`,
    [ErrorCodes.INVALID_AGENT_NAME]: `### Troubleshooting

- Agent name must be a valid JavaScript identifier
- Start with letter or underscore, followed by letters, numbers, or underscores
- Avoid special characters and spaces
- Example valid names: MyAgent, data_analyzer, AgentV2
`,
    [ErrorCodes.GENERATION_FAILED]: `### Troubleshooting

- Verify all required parameters are provided
- Check that requirements object is complete and valid
- Ensure template ID matches one of the 5 available templates
- Review error details for specific failure reason
`,
    [ErrorCodes.VALIDATION_ERROR]: `### Troubleshooting

- Review validation errors in details section
- Ensure all required fields are present and correctly typed
- Check enum fields have valid values
- Verify array fields contain at least one element where required
`,
    [ErrorCodes.INVALID_PARAMETER]: `### Troubleshooting

- Review parameter names and types in tool documentation
- Ensure all required parameters are provided
- Check that optional parameters use default values if omitted
- Verify parameter values match expected types (string, boolean, array, object)
`,
    [ErrorCodes.INTERNAL_ERROR]: `### Troubleshooting

- This is an unexpected error in the tool implementation
- Try the operation again
- If error persists, review input parameters for edge cases
- Check system logs for additional details
`,
    [ErrorCodes.UNKNOWN_ERROR]: `### Troubleshooting

- An unexpected error occurred
- Review error message and stack trace if available
- Verify all inputs are valid and complete
- Try simplifying the request to isolate the issue
`,
  };

  return tips[code] || tips[ErrorCodes.UNKNOWN_ERROR];
}
