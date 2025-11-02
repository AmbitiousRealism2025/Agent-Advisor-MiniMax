# Tool Reference Documentation

Comprehensive reference for all advisor agent tools. This documentation provides parameter specifications, return formats, and usage examples for the 6 tools used in the agent workflow.

## Table of Contents

1. [Interview Tool](#interview-tool-ask_interview_question)
2. [Classification Tool](#classification-tool-classify_agent_type)
3. [Generation Tools](#generation-tools)
   - [Generate Agent Code](#generate_agent_code)
   - [Generate System Prompt](#generate_system_prompt)
   - [Generate Config Files](#generate_config_files)
4. [Export Tool](#export-tool-generate_implementation_guide)

---

## Interview Tool: `ask_interview_question`

**Purpose**: Manages the interactive interview workflow to gather agent requirements from users.

**Implementation**: `src/lib/interview/tool-handler.ts`

### Actions

| Action | Description | Required Parameters | Returns |
|--------|-------------|---------------------|---------|
| `start` | Begin new interview session | None | Session ID + first question |
| `answer` | Submit response to current question | `sessionId`, `response` | Next question or completion |
| `skip` | Skip optional question | `sessionId` | Next question |
| `resume` | Resume existing session | `sessionId` | Current state |
| `status` | Check interview progress | `sessionId` | Progress summary |

### Parameters

- **`action`** (required): One of: `"start"`, `"answer"`, `"skip"`, `"resume"`, `"status"`
- **`sessionId`** (optional): UUID string identifying the session
  - Required for: `answer`, `skip`, `resume`, `status`
  - Not used for: `start`
- **`response`** (optional): User's answer to the current question
  - Type: `string | boolean | string[]`
  - Required for: `answer` action
  - Not used for: `skip`, `resume`, `status`

### Return Format (JSON)

```json
{
  "status": "in_progress" | "completed",
  "sessionId": "uuid-string",
  "currentQuestion": {
    "id": "q1_agent_name",
    "text": "What would you like to name your agent?",
    "type": "text" | "boolean" | "multi-select",
    "required": true,
    "options": ["option1", "option2"]
  },
  "progress": {
    "stage": "basic-info",
    "questionsAnswered": 5,
    "totalQuestions": 15,
    "percentComplete": 33
  },
  "requirements": {
    "name": "Sales Data Analyzer",
    "description": "...",
    "primaryOutcome": "..."
  }
}
```

### Usage Example

```typescript
// Start interview
const startResult = await askInterviewQuestionHandler.handle({ action: 'start' });

// Answer question
const answerResult = await askInterviewQuestionHandler.handle({
  action: 'answer',
  sessionId: 'session-uuid',
  response: 'My Agent Name'
});

// Skip optional question
const skipResult = await askInterviewQuestionHandler.handle({
  action: 'skip',
  sessionId: 'session-uuid'
});
```

---

## Classification Tool: `classify_agent_type`

**Purpose**: Analyzes user requirements and recommends the best-matching agent template from the 5 available options.

**Implementation**: `src/lib/classification/tool-handler.ts`

### Parameters

- **`requirements`** (required): Complete `AgentRequirements` object from interview phase
  - Type: `AgentRequirements` interface
  - Must include: `name`, `description`, `primaryOutcome`, `targetAudience`, `interactionStyle`, `deliveryChannels`, `successMetrics`, `capabilities`, `environment`
- **`includeAlternatives`** (optional): Whether to return alternative template matches
  - Type: `boolean`
  - Default: `true`

### Return Format (JSON)

```json
{
  "status": "success" | "error",
  "classification": {
    "selectedTemplate": "data-analyst",
    "confidence": 0.92,
    "reasoning": "Requirements match data analysis capabilities..."
  },
  "recommendations": {
    "agentType": "data-analyst",
    "requiredDependencies": ["csv-parse", "d3"],
    "mcpServers": [
      {
        "name": "filesystem",
        "description": "File access for CSV processing",
        "url": "https://github.com/...",
        "authentication": "none"
      }
    ],
    "systemPrompt": "You are a data analysis agent...",
    "starterCode": "// Generated starter code",
    "toolConfigurations": [],
    "estimatedComplexity": "medium",
    "implementationSteps": [
      "Set up project structure",
      "Configure CSV parsing tool",
      "Implement analysis functions"
    ]
  },
  "alternatives": [
    {
      "templateId": "automation-agent",
      "confidence": 0.68,
      "reasoning": "Also suitable for scheduled data processing"
    }
  ],
  "nextSteps": [
    "Review selected template",
    "Generate agent code",
    "Configure tools"
  ]
}
```

### Usage Example

```typescript
const classificationResult = await classifyAgentTypeHandler.handle({
  requirements: interviewRequirements,
  includeAlternatives: true
});

const selectedTemplate = classificationResult.classification.selectedTemplate;
const recommendations = classificationResult.recommendations;
```

---

## Generation Tools

All generation tools return **Markdown-formatted documents** with code blocks, file headers, and copy instructions.

### `generate_agent_code`

**Purpose**: Generates complete TypeScript implementation for the agent based on the selected template.

**Implementation**: `src/lib/generation/tool-handlers.ts:GenerateAgentCodeHandler`

#### Parameters

- **`templateId`** (required): One of: `"data-analyst"`, `"content-creator"`, `"code-assistant"`, `"research-agent"`, `"automation-agent"`
- **`agentName`** (required): Display name for the agent (supports spaces, hyphens, underscores)
- **`includeComments`** (optional): Add explanatory comments to code (default: `true`)
- **`includeErrorHandling`** (optional): Add try-catch blocks and error management (default: `true`)
- **`includeSampleUsage`** (optional): Add usage examples at end of file (default: `true`)

#### Return Format (Markdown)

```markdown
## Agent Code Generated

### File: `src/index.ts`

\```typescript
import { createMcpServer } from '@anthropic-ai/claude-agent-sdk';
// ... generated code
\```

**To use**: Copy the above code to `src/index.ts` in your project directory.

## Code Metadata

- **Template**: data-analyst
- **Agent Name**: Sales Data Analyzer
- **Lines of Code**: 250
- **Features Included**:
  - Comments: Yes
  - Error Handling: Yes
  - Sample Usage: Yes

## Next Steps

1. Create your project directory
2. Copy code to `src/index.ts`
3. Install dependencies with `npm install`
4. Configure environment variables
```

---

### `generate_system_prompt`

**Purpose**: Generates customized system prompt tailored to the agent's specific requirements and template.

**Implementation**: `src/lib/generation/tool-handlers.ts:GenerateSystemPromptHandler`

#### Parameters

- **`templateId`** (required): Template identifier
- **`requirements`** (required): Full `AgentRequirements` from interview
- **`includeExamples`** (optional): Include usage examples in prompt (default: `true`)
- **`includeConstraints`** (optional): Include behavior constraints (default: `true`)
- **`verbosityLevel`** (optional): One of: `"concise"`, `"standard"`, `"detailed"` (default: `"standard"`)

#### Return Format (Markdown)

```markdown
## System Prompt Generated

### File: `system-prompt.md`

\```markdown
# Sales Data Analyzer System Prompt

You are a specialized data analysis agent...

## Core Capabilities
- CSV processing and validation
- Statistical analysis
...
\```

**To use**: Copy the above prompt to your agent's system prompt configuration.

## Prompt Metadata

- **Template**: data-analyst
- **Agent Name**: Sales Data Analyzer
- **Word Count**: 450
- **Sections**: 5
- **Verbosity Level**: standard
- **Generated At**: 2025-11-02T16:30:00.000Z

## Next Steps

1. Review the generated system prompt carefully
2. Customize specific sections to match project needs
3. Update your agent configuration with the prompt
```

---

### `generate_config_files`

**Purpose**: Generates all configuration files needed for the project: `package.json`, `tsconfig.json`, `.env.example`.

**Implementation**: `src/lib/generation/tool-handlers.ts:GenerateConfigFilesHandler`

#### Parameters

- **`templateId`** (required): Template identifier
- **`agentName`** (required): Agent display name
- **`requirements`** (required): Full `AgentRequirements` from interview
- **`files`** (optional): Array specifying which files to generate
  - Options: `["package", "tsconfig", "env", "gitignore"]`
  - Default: `["package", "tsconfig", "env"]`

#### Return Format (Markdown)

```markdown
## Configuration Files Generated

### File: `package.json`

\```json
{
  "name": "sales-data-analyzer",
  "version": "1.0.0",
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^1.0.0",
    "csv-parse": "^5.5.0"
  }
}
\```

**To use**: Copy the above content to `package.json` in your project root.

### File: `tsconfig.json`

\```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext"
  }
}
\```

**To use**: Copy the above content to `tsconfig.json` in your project root.

### File: `.env.example`

\```bash
MINIMAX_JWT_TOKEN=your_jwt_token_here
LOG_LEVEL=info
\```

**To use**: Copy the above content to `.env.example` in your project root.

## Generation Metadata

- **Template**: data-analyst
- **Agent Name**: Sales Data Analyzer
- **Files Generated**: 3
- **Generated At**: 2025-11-02T16:30:00.000Z

## Next Steps

1. Create a new project directory
2. Copy each file above to its specified location
3. Run `npm install` to install dependencies
4. Copy `.env.example` to `.env` and configure credentials
```

---

## Export Tool: `generate_implementation_guide`

**Purpose**: Generates comprehensive implementation guide (`IMPLEMENTATION.md`) and project README (`README.md`) with step-by-step instructions.

**Implementation**: `src/lib/export/tool-handler.ts`

### Parameters

- **`templateId`** (required): Template identifier
- **`agentName`** (required): Agent display name
- **`requirements`** (required): Full `AgentRequirements` from interview
- **`recommendations`** (required): `AgentRecommendations` from classification phase
  - Type: Object with fields: `agentType`, `requiredDependencies`, `mcpServers`, `systemPrompt`, `starterCode`, `toolConfigurations`, `estimatedComplexity`, `implementationSteps`
- **`includeReadme`** (optional): Generate README.md file (default: `true`)
- **`includeExamples`** (optional): Include usage examples in guide (default: `true`)

### Return Format (Markdown)

```markdown
## Implementation Guide

### File: `IMPLEMENTATION.md`

\```markdown
# Sales Data Analyzer - Implementation Guide

## Overview
Comprehensive step-by-step guide to implement your agent...

## Phase 1: Project Setup
1. Create project directory
2. Initialize npm project
3. Install dependencies

## Phase 2: Core Implementation
...
\```

**To use**: Copy the above content to `IMPLEMENTATION.md` in your project root.

### File: `README.md`

\```markdown
# Sales Data Analyzer

Analyzes sales data and generates insights...

## Features
- CSV processing
- Statistical analysis

## Quick Start
\```bash
npm install
npm run dev
\```
\```

**To use**: Copy the above content to `README.md` for project documentation.

## Files Generated

1. `IMPLEMENTATION.md` – Detailed build and rollout guide
2. `README.md` – Project overview and quick start

## Generation Metadata

- **Template**: data-analyst
- **Agent Name**: Sales Data Analyzer
- **Generated At**: 2025-11-02T16:30:00.000Z
- **Files Created**: 2

## Next Steps

1. Review IMPLEMENTATION.md for detailed setup instructions
2. Follow the roadmap to implement required tools and integrations
3. Update README.md with project-specific details
```

---

## Error Handling

All tools use structured error responses with error codes and troubleshooting guidance. See `src/types/errors.ts` for complete error code definitions.

### Common Error Codes

- `INVALID_TEMPLATE`: Unknown template ID provided
- `INVALID_AGENT_NAME`: Agent name is empty or invalid
- `INVALID_REQUIREMENTS`: Requirements object missing required fields
- `SESSION_NOT_FOUND`: Interview session ID not found
- `GENERATION_FAILED`: Generation process encountered an error

### Error Response Format (JSON)

Interview and classification tools return errors as JSON:

```json
{
  "status": "error",
  "code": "INVALID_TEMPLATE",
  "message": "Invalid template ID: invalid-template-xyz",
  "details": {
    "field": "templateId",
    "validValues": ["data-analyst", "content-creator", "code-assistant", "research-agent", "automation-agent"],
    "context": {
      "provided": "invalid-template-xyz"
    }
  }
}
```

Generation and export tools return errors as Markdown:

```markdown
## Error

Invalid template ID: invalid-template-xyz

**Error Code**: `INVALID_TEMPLATE`

### Error Details

- **Field**: templateId
- **Valid Values**: `data-analyst`, `content-creator`, `code-assistant`, `research-agent`, `automation-agent`
- **Provided Value**: invalid-template-xyz

### Troubleshooting

1. Check that the template ID matches one of the valid values listed above
2. Template IDs are case-sensitive and must use kebab-case
3. Use the `classify_agent_type` tool to get template recommendations
```

---

## Tool Workflow

Typical advisor workflow uses tools in this sequence:

1. **Interview** (`ask_interview_question`): Gather requirements
   - Start session → Answer questions → Complete interview
   - Returns: `AgentRequirements` object

2. **Classification** (`classify_agent_type`): Match requirements to template
   - Input: Requirements from interview
   - Returns: Recommended template + `AgentRecommendations`

3. **Generation** (3 tools in parallel):
   - `generate_agent_code`: TypeScript implementation
   - `generate_system_prompt`: Customized prompt
   - `generate_config_files`: Project configuration files

4. **Export** (`generate_implementation_guide`): Comprehensive documentation
   - Input: Requirements + Recommendations + Generated files
   - Returns: IMPLEMENTATION.md + README.md

---

## Template Options

All generation tools support these 5 templates:

1. **`data-analyst`**: CSV processing, statistics, visualization, reporting
2. **`content-creator`**: Blog posts, SEO optimization, multi-platform formatting
3. **`code-assistant`**: Code review, refactoring, test generation, debugging
4. **`research-agent`**: Web search, content extraction, fact-checking, source verification
5. **`automation-agent`**: Task scheduling, workflow orchestration, queue management

Each template provides:
- Pre-configured tool definitions
- Template-specific system prompt
- Recommended dependencies and MCP servers
- Implementation best practices
- Sample usage code

---

## Additional Resources

- **Complete Implementation**: See `src/advisor-agent.ts` for tool registration and MCP server setup
- **Error Types**: See `src/types/errors.ts` for all error codes and helper functions
- **Templates**: See `src/templates/` for complete template definitions
- **Test Examples**: See `tests/integration/error-handling.test.ts` for tool usage patterns
