# Tool Reference Documentation

Comprehensive reference for all advisor agent tools. This documentation provides parameter specifications, return formats, and usage examples for the three tools used in the documentation-first workflow.

## Table of Contents

1. [Interview Tool](#interview-tool-ask_interview_question)
2. [Classification Tool](#classification-tool-classify_agent_type)
3. [Planning Document Tool](#planning-document-tool-generate_planning_document)

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

## Planning Document Tool: `generate_planning_document`

**Purpose**: Produces the comprehensive Markdown planning brief that replaces automated code and configuration generation. The document captures architecture, phased delivery, security, metrics, risks, and deployment guidance for the selected template.

**Implementation**: `src/lib/documentation/tool-handler.ts`

### Parameters

- **`templateId`** (required): Template identifier (`"data-analyst"`, `"content-creator"`, `"code-assistant"`, `"research-agent"`, `"automation-agent"`).
- **`agentName`** (required): Display name for the agent. Must be at least three characters and start with a letter or underscore.
- **`requirements`** (required): Complete `AgentRequirements` object from the interview phase.
- **`recommendations`** (required): `AgentRecommendations` object returned by `classify_agent_type`.

### Return Format (Markdown)

```markdown
## Planning Document

### File: `docs/planning.md`

\```markdown
# Sales Insights Advisor Planning Document

## Overview
- **Agent Name:** Sales Insights Advisor
- **Template:** data-analyst (`data-analyst`)
- **Primary Outcome:** Weekly revenue trend insights
- **Target Audience:** Sales leadership, finance analysts
- **Interaction Style:** task-focused
- **Delivery Channels:** cli
- **Estimated Complexity:** medium
- **Recommended MCP Servers:** `filesystem`, `web-fetch`
- **Planned Tooling:** read_csv, analyze_data, generate_visualization, export_report

## Requirements
- **Description:** Automate weekly reporting for sales leadership...
- **Success Metrics:**
- Improve forecast accuracy by 10%
- Reduce manual report time by 50%
- **Constraints:**
- Must operate without database access
- **Preferred Technologies:**
- Node.js 18+
- **Capability Expectations:** Memory: short-term | File Access: required | Web Access: required | Code Execution: not required | Data Analysis: required | Tool Integrations: salesforce, tableau
- **Additional Notes:** Coordinate with data governance for export approvals

## Architecture
- **Core Capabilities:**
- data-processing
- analytics
- reporting
- **Default Tools:**
1. **read_csv** - Parse CSV files with configurable delimiter support
2. **analyze_data** - Perform descriptive, correlation, regression analysis
3. **generate_visualization** - Render charts via Chart.js
4. **export_report** - Produce Markdown or HTML reports
- **Integration Targets:**
  - Salesforce, Tableau

... (Sections: Phases, Security, Metrics, Risk, Deployment)
\```

**To use**: Copy the above Markdown to `docs/planning.md` within your project workspace.

## Next Steps

1. Review the planning brief with stakeholders.
2. Confirm owners and target timelines for each phase.
3. Execute the roadmap with human oversight.
```

### Error Format (Markdown)

Errors are returned as Markdown with context and troubleshooting tips:

```markdown
## Error

Invalid template ID: invalid-template-xyz

**Error Code**: `INVALID_TEMPLATE`

### Error Details

- **Field**: `templateId`
- **Valid Values**: `data-analyst`, `content-creator`, `code-assistant`, `research-agent`, `automation-agent`

### Troubleshooting

- Verify the template ID returned by `classify_agent_type`
- Template IDs are case-sensitive and use kebab-case
- Supported templates: data-analyst, content-creator, code-assistant, research-agent, automation-agent
```

---

## Error Handling

All tools use structured error responses with error codes and troubleshooting guidance. See `src/types/errors.ts` for complete error code definitions.

### Common Error Codes

- `INVALID_TEMPLATE`: Unknown template ID provided
- `INVALID_AGENT_NAME`: Agent name is empty or invalid
- `INVALID_REQUIREMENTS`: Requirements object missing required fields
- `SESSION_NOT_FOUND`: Interview session ID not found
- `VALIDATION_ERROR`: Input failed schema validation
- `INTERNAL_ERROR`: Unexpected failure inside tool handler

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

`generate_planning_document` returns errors as Markdown:

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

3. **Documentation** (`generate_planning_document`): Produce planning brief
   - Input: Template ID + Agent Name + Requirements + Recommendations
   - Returns: Markdown planning document (`docs/planning.md`)
## Template Options

All tools support these 5 templates:

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
- Planning considerations captured in the documentation phase

---

## Additional Resources

- **Complete Implementation**: See `src/advisor-agent.ts` for tool registration and MCP server setup
- **Error Types**: See `src/types/errors.ts` for all error codes and helper functions
- **Templates**: See `src/templates/` for complete template definitions
- **Test Examples**: See `tests/integration/error-handling.test.ts` for tool usage patterns
