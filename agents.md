# Agent Onboarding Guide

Welcome to the Agent Advisor MiniMax MVP. This document gives future coding agents a concise overview of the project goals, setup steps, and expectations for each development phase.

## Mission Overview
- Build an advisor agent that interviews developers, classifies their needs, and generates Claude Agent SDK projects targeting the MiniMax API.
- Maintain strict adherence to the five core templates defined in the Phase 1 plan until the roadmap specifies otherwise.
- Ensure all generated code works with Node.js 18+, the MiniMax-M2 model, and the Claude Agent SDK.

## Setup Checklist
1. Review `agent_advisor_mvp-plan.md` for architectural details, timelines, and template specifications.
2. Read the SDK primers in `Agent SDK Primers/` to align with approved integration patterns.
3. Install dependencies: `npm install`.
4. Copy `.env.example` to `.env` and populate:
   - `MINIMAX_JWT_TOKEN` — required MiniMax JWT credential.
   - `CLI_PATH` — optional local Claude CLI path for advanced tooling.
   - `LOG_LEVEL` (default `info`) and `NODE_ENV` (default `development`).
5. Verify TypeScript builds with `npm run build` before committing changes.

## Project Layout
```
src/
├── templates/            # Agent templates (Phase 2 deliverable)
├── lib/
│   ├── interview/        # Interview flow logic
│   ├── classification/   # Template matching engine
│   ├── generation/       # Code + prompt generation
│   └── export/           # Packaging + delivery utilities
├── types/                # Shared TypeScript definitions
└── utils/                # Configuration + validation helpers

tests/                    # Vitest suites (Phase 2+)
examples/                 # Generated reference projects
```

## Scripts
- `npm run dev` — Watch-mode development via `tsx`.
- `npm run build` — TypeScript compilation with declaration output.
- `npm run test` — Vitest test runner (add coverage as features land).
- `npm start` — Execute the compiled advisor agent from `dist/`.

## Implementation Status

### ✅ Phase 1 - Interview Module (Completed)
The interview module has been fully implemented and includes:

#### Core Components
1. **Questions System** (`src/lib/interview/questions.ts`)
   - 15 comprehensive questions across 4 stages (discovery, requirements, architecture, output)
   - Supports text, choice, boolean, and multiselect question types
   - Configurable required/optional fields with hints

2. **State Management** (`src/lib/interview/state-manager.ts`)
   - `InterviewStateManager` class for session lifecycle management
   - Automatic response-to-requirements mapping
   - Stage progression with completion tracking
   - Resume capability for interrupted sessions

3. **Validation** (`src/lib/interview/validator.ts`)
   - Zod-based type-safe validation
   - Question-specific response validation
   - Stage completion verification
   - Complete requirements validation

4. **Persistence** (`src/lib/interview/persistence.ts`)
   - Async file-based session storage in `sessions/` directory
   - Session save/load/list/delete operations
   - Automatic cleanup of old sessions (7-day default)
   - Proper Date serialization handling

5. **Tool Integration** (`src/lib/interview/tool-handler.ts`)
   - Claude Agent SDK compatible tool: `ask_interview_question`
   - Actions: start, answer, skip, resume, status
   - Returns proper `CallToolResult` format
   - Comprehensive error handling

#### Module Usage
```typescript
import { createInterviewTool, InterviewStateManager } from './lib/interview';

// Create tool for Claude Agent SDK
const interviewTool = createInterviewTool();

// Or use the state manager directly
const manager = new InterviewStateManager();
manager.initializeSession();
const question = manager.getCurrentQuestion();
manager.recordResponse(question.id, 'My Agent Name');
```

#### Interview Flow
The `ask_interview_question` tool supports the following actions:

**Start a new session:**
```json
{ "action": "start" }
```
Returns: Session ID and first question

**Answer a question:**
```json
{
  "action": "answer",
  "sessionId": "uuid",
  "response": "answer value"
}
```
Returns: Next question or completion status

**Skip optional question:**
```json
{
  "action": "skip",
  "sessionId": "uuid"
}
```
Returns: Next question (only works for non-required questions)

**Resume existing session:**
```json
{
  "action": "resume",
  "sessionId": "uuid"
}
```
Returns: Current question and progress

**Check status:**
```json
{
  "action": "status",
  "sessionId": "uuid"
}
```
Returns: Session state and collected requirements

### ✅ Phase 2 - Agent Templates (Completed)
Five production-ready agent templates have been implemented with complete tool definitions, system prompts, and starter code.

#### Template Overview

| Template ID | Name | Tools | Capabilities |
|------------|------|-------|--------------|
| `data-analyst` | Data Analyst Agent | 4 | CSV processing, statistical analysis, visualization, reporting |
| `content-creator` | Content Creator Agent | 4 | Content generation, SEO optimization, multi-platform formatting |
| `code-assistant` | Code Assistant Agent | 4 | Code review, refactoring, test generation, quality analysis |
| `research-agent` | Research Agent | 4 | Web search, scraping, fact extraction, source verification |
| `automation-agent` | Automation Agent | 4 | Task scheduling, workflow orchestration, queue management |

#### 1. Data Analyst Template
**File:** `src/templates/data-analyst.ts`
**Purpose:** CSV data processing, statistical analysis, and report generation

**Tools:**
- `read_csv(filePath, delimiter, hasHeaders, encoding)` - Parse CSV with top-level parameters (encoding: utf8/utf16le/latin1)
- `analyze_data(data, analysisType, columns?, groupBy?)` - Descriptive, correlation, regression, distribution analysis
- `generate_visualization(data, chartType, xAxis, yAxis, title?, outputPath)` - Bar, line, scatter, pie, histogram, heatmap charts (xAxis/yAxis required)
- `export_report(data, format, outputPath, includeMetadata)` - Export as JSON, CSV, Markdown, HTML (default: markdown)

**Tool Schema Details:**
```typescript
// read_csv - All parameters at top level
{
  filePath: string (min: 1),
  delimiter: string (default: ','),
  hasHeaders: boolean (default: true),
  encoding: 'utf8' | 'utf16le' | 'latin1' (default: 'utf8')
}

// analyze_data - Removed options object, added groupBy
{
  data: Array<Record<unknown>>,
  analysisType: 'descriptive' | 'correlation' | 'regression' | 'distribution',
  columns?: string[],
  groupBy?: string
}

// generate_visualization - xAxis/yAxis required, no config nesting
{
  data: Array<Record<unknown>>,
  chartType: 'bar' | 'line' | 'scatter' | 'pie' | 'histogram' | 'heatmap',
  xAxis: string,
  yAxis: string,
  title?: string,
  outputPath: string
}

// export_report - Simplified to data parameter, removed PDF
{
  data: Record<unknown>,
  format: 'json' | 'csv' | 'markdown' | 'html' (default: 'markdown'),
  outputPath: string,
  includeMetadata: boolean (default: true)
}
```

**Dependencies:** `csv-parse`, `chart.js` (or d3, plotly)
**Recommended Integrations:** PostgreSQL, MySQL, S3, Google Sheets, Tableau

#### 2. Content Creator Template
**File:** `src/templates/content-creator.ts`
**Purpose:** Blog posts, documentation, marketing copy, and SEO optimization

**Tools:**
- `generate_outline(topic, contentType, targetAudience?, keyPoints?, tone?, length?)` - Structured outlines
- `write_section(sectionTitle, outline?, context?, style?, wordCount?)` - Section writing with tone control
- `optimize_for_seo(content, primaryKeyword, secondaryKeywords?, options?)` - SEO analysis and optimization
- `format_content(content, outputFormat, options?)` - Format for WordPress, Medium, GitHub, LinkedIn

**Dependencies:** None (core functionality)
**Recommended Integrations:** WordPress, Contentful, Grammarly API, Medium API

#### 3. Code Assistant Template
**File:** `src/templates/code-assistant.ts`
**Purpose:** Code review, debugging, refactoring, and test generation

**Tools:**
- `analyze_code(code, language, analysisTypes, options?)` - Quality, security, performance analysis
- `suggest_improvements(code, language, focus, options?)` - Prioritized improvements with examples
- `generate_tests(code, language, testFramework?, options?)` - Unit/integration tests with mocks
- `refactor_code(code, language, refactoringGoals, options?)` - Extract functions, simplify, modernize

**Dependencies:** None (core functionality)
**Recommended Integrations:** ESLint, Prettier, Jest, Vitest, SonarQube, GitHub

#### 4. Research Agent Template
**File:** `src/templates/research-agent.ts`
**Purpose:** Web search, content extraction, fact-checking, and source verification

**Tools:**
- `web_search(query, options?)` - Search with date range, domain filtering, language options
- `scrape_content(url, selectors?, options?)` - Extract content with CSS selectors
- `extract_facts(content, focusAreas?, options?)` - Extract statistics, claims, dates, entities
- `verify_sources(claims, sources, options?)` - Verify credibility with cross-referencing

**Dependencies:** `axios`, `cheerio`
**Recommended Integrations:** Google Custom Search, Bing API, Puppeteer, Wikipedia API

#### 5. Automation Agent Template
**File:** `src/templates/automation-agent.ts`
**Purpose:** Task orchestration, workflow automation, and scheduled execution

**Tools:**
- `schedule_task(taskId, taskName, schedule, action, options?)` - Cron-based scheduling
- `execute_workflow(workflowId, steps, input?, options?)` - Multi-step conditional workflows
- `monitor_status(targets, options?)` - Status monitoring with history and metrics
- `manage_queue(queueName, operation, config?)` - Queue management with priority and rate limiting

**Dependencies:** `node-cron`, `bull` (or BullMQ)
**Recommended Integrations:** RabbitMQ, Redis, Temporal, Airflow, Prometheus

#### Template System Architecture

**Core Files:**
- `src/templates/template-types.ts` - Shared types and helpers
  - `TemplateCategory` type
  - `ToolSchemaDefinition` interface
  - `convertToolSchemaToConfig()` - Zod to JSON conversion
  - `createTemplate()` - Template factory function

- `src/templates/index.ts` - Template registry and utilities
  - `ALL_TEMPLATES` - Array of all 5 templates
  - `getTemplateById(id)` - Template lookup
  - `getTemplatesByCapability(tag)` - Filter by capability
  - `getAllCapabilityTags()` - Get all unique tags
  - `TEMPLATE_COUNT`, `TEMPLATE_CATEGORIES` - Constants

**Template Structure:**
```typescript
interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  capabilityTags: string[];
  idealFor: string[];
  systemPrompt: string;
  defaultTools: ToolConfiguration[];
  requiredDependencies: string[];
  recommendedIntegrations: string[];
}
```

#### Using Templates
```typescript
import {
  ALL_TEMPLATES,
  getTemplateById,
  getTemplatesByCapability,
  dataAnalystTemplate
} from './src/templates';

// Access all templates
console.log(`${ALL_TEMPLATES.length} templates available`);

// Get specific template
const template = getTemplateById('data-analyst');
console.log(template.systemPrompt);
console.log(template.defaultTools); // JSON-serializable configs

// Find templates by capability
const dataTemplates = getTemplatesByCapability('data-processing');
```

### ✅ Phase 3 - Classification Module (Completed)
The classification module analyzes interview requirements and recommends the best template match.

#### Core Components

**1. AgentClassifier (`src/lib/classification/classifier.ts`)**

Intelligent template matching engine with multi-factor scoring:

**Methods:**
- `classify(requirements)` → Full `AgentRecommendations` with template, tools, MCP servers, complexity, steps
- `scoreAllTemplates(requirements)` → Array of `TemplateScore[]` sorted by confidence
- `scoreTemplate(template, requirements)` → Individual template score (max 100 points):
  - **Capability matching** (40 pts) - Matches required capabilities from interview
  - **Use case alignment** (30 pts) - Primary outcome alignment with template `idealFor`
  - **Interaction style** (15 pts) - Conversational/task-focused/collaborative compatibility
  - **Capability requirements** (15 pts) - File access, web access, data analysis support
- `generateMCPServers(requirements, template)` → Recommended MCP server configurations:
  - `web-fetch` for webAccess capability
  - `filesystem` for fileAccess capability
  - `data-tools` for data analysis
  - `memory` for long-term memory requirements
- `customizeSystemPrompt(template, requirements)` → Personalized system prompt with:
  - Agent name, description, target audience
  - Primary objective and success metrics
  - Constraints and interaction style guidance
- `assessComplexity(requirements, template)` → Complexity rating (low/medium/high) based on:
  - Tool count (>6 tools = high complexity)
  - Capability requirements (code execution, long-term memory = higher)
  - Integration count, delivery channels, compliance requirements
- `generateImplementationSteps(requirements, template, complexity)` → Detailed roadmap with:
  - Project initialization and dependency setup
  - Tool implementation steps
  - Capability-specific configuration (file access, web access, memory)
  - Testing, validation, and documentation steps

**2. Classification Tool (`src/lib/classification/tool-handler.ts`)**

Claude Agent SDK tool: `classify_agent_type`

**Input Schema:**
```typescript
{
  requirements: AgentRequirements,  // Full requirements from interview
  includeAlternatives?: boolean     // Include top 3 alternative templates (default: true)
}
```

**Output Structure:**
```json
{
  "status": "success",
  "classification": {
    "selectedTemplate": "data-analyst",
    "confidence": 87.5,
    "reasoning": "Matched capabilities: data-processing, statistics. Compatible with task-focused style..."
  },
  "recommendations": {
    "agentType": "data-analyst",
    "systemPrompt": "# Data Analyst Agent\n\nYou are a specialized...",
    "tools": [...],
    "dependencies": ["csv-parse", "chart.js"],
    "mcpServers": [{...}],
    "complexity": "medium",
    "implementationSteps": [...]
  },
  "alternatives": [
    {"templateId": "research-agent", "confidence": 62.3, ...},
    {"templateId": "automation-agent", "confidence": 45.7, ...}
  ],
  "nextSteps": [...]
}
```

#### Module Usage
```typescript
import { AgentClassifier, createClassifyAgentTypeTool } from './lib/classification';

// Create tool for Claude Agent SDK
const classifyTool = createClassifyAgentTypeTool();

// Or use classifier directly
const classifier = new AgentClassifier();
const recommendations = classifier.classify(requirements);
console.log(recommendations.agentType);           // 'data-analyst'
console.log(recommendations.estimatedComplexity); // 'medium'
console.log(recommendations.mcpServers.length);   // 2
console.log(recommendations.implementationSteps.length); // 8-12 steps
```

### ✅ Phase 4 - Generation Module (Completed)
The generation module creates complete, production-ready agent projects from templates and requirements.

#### Core Components

**1. CodeGenerator (`src/lib/generation/code-generator.ts`)**

Generates complete TypeScript agent implementation with all components.

**Methods:**
- `generateFullCode(options)` → Complete agent.ts implementation with:
  - Import statements (SDK, Zod, dependencies)
  - Utility functions (error handling, validation)
  - Tool implementations (one per template tool)
  - Agent initialization with MiniMax config
  - Main execution function
  - Sample usage documentation

**Options:**
```typescript
{
  templateId: string,
  agentName: string,
  includeComments?: boolean,        // Default: true
  includeErrorHandling?: boolean,   // Default: true
  includeSampleUsage?: boolean      // Default: true
}
```

**Generated Code Structure:**
```typescript
// Imports (SDK, Zod, template-specific dependencies)
import { Agent, tool } from '@anthropic-ai/claude-agent-sdk';
import { getMinimaxConfig } from './config.js';

// Utilities
function handleError(error, context) {...}

// Tool Implementations (generated from template.defaultTools)
const readCsvSchema = z.object({...});
export const readCsvTool = tool('read_csv', '...', readCsvSchema.shape, async (input) => {...});

// Agent Initialization
const config = getMinimaxConfig();
const agent = new Agent({
  model: config.model,
  apiKey: config.apiKey,
  systemPrompt: `...`,
  tools: [readCsvTool, analyzeDataTool, ...]
});

// Main Function
async function main() {...}
```

**2. PromptGenerator (`src/lib/generation/prompt-generator.ts`)**

Generates customized system prompts with comprehensive role definition.

**Methods:**
- `generate(options)` → Full system prompt with sections:
  - **Header** - Agent name and description
  - **Role Definition** - Template role + ideal use cases
  - **Capabilities** - Core tools, system capabilities, integrations
  - **Objectives** - Primary outcome, target audience
  - **Constraints** - Operational constraints, compliance requirements
  - **Interaction Guidelines** - Style-specific guidance, delivery channels
  - **Examples** - Template-specific interaction examples
  - **Success Metrics** - How performance is measured
- `generateConcise(options)` → Short version (no examples, concise sections)
- `generateDetailed(options)` → Extended version (all sections, detailed examples)

**Options:**
```typescript
{
  templateId: string,
  requirements: AgentRequirements,
  includeExamples?: boolean,      // Default: true
  includeConstraints?: boolean,   // Default: true
  verbosityLevel?: 'concise' | 'standard' | 'detailed'  // Default: 'standard'
}
```

**Generated Prompt Example:**
```markdown
# My Data Agent

Analyzes sales data and generates insights

## Your Role
You are My Data Agent, a specialized data analyst that processes CSV files, performs statistical analysis...

## Capabilities
### Core Tools
- **read_csv**: Parse CSV files with configurable delimiters
- **analyze_data**: Perform descriptive, correlation, regression analysis
...

## Primary Objectives
Generate weekly sales insights with trend analysis

### Target Audience
You are designed to serve: Sales managers, Marketing analysts

## Interaction Guidelines
Be direct and efficient. Focus on completing tasks with minimal back-and-forth...

## Success Metrics
Your performance will be measured by:
- Accuracy of statistical analysis
- Speed of report generation
...
```

**3. ConfigGenerator (`src/lib/generation/config-generator.ts`)**

Generates all project configuration files for a complete agent project.

**Methods:**
- `generateAgentConfigJSON(options)` → `agent.config.json` with:
  - Agent metadata (name, version, template)
  - Model configuration (MiniMax-M2, API settings)
  - Tool configurations and capabilities
  - MCP server configurations
  - Environment and deployment settings
- `generateEnvFile(options)` → `.env.example` with:
  - MiniMax JWT token placeholder
  - Template-specific environment variables
  - MCP server authentication settings
- `generatePackageJSON(options)` → `package.json` with:
  - Project metadata and scripts
  - Claude Agent SDK + template dependencies
  - Dev dependencies (TypeScript, Vitest, ESLint)
  - Proper ESM configuration
- `generateTSConfig()` → `tsconfig.json` with:
  - ES2022 target, Node module resolution
  - Strict TypeScript settings
  - Source maps and declarations
- `generateREADME(options)` → `README.md` with:
  - Project overview and features
  - Tool documentation
  - Installation and usage instructions
  - Implementation steps and success metrics
- `generateImplementationGuide(options)` → `IMPLEMENTATION.md` with:
  - Quick start checklist
  - Implementation roadmap with status tracking
  - Testing strategy
  - Deployment checklist

**Options:**
```typescript
{
  templateId: string,
  agentName: string,
  projectName?: string,           // Default: kebab-case agent name
  requirements: AgentRequirements,
  recommendations?: AgentRecommendations
}
```

**4. Generation Tools (`src/lib/generation/tool-handlers.ts`)**

Three Claude Agent SDK tools for the generation phase:

**`generate_agent_code`**
- Input: `templateId`, `agentName`, options (comments, error handling, sample usage)
- Output: Complete TypeScript code + metadata (LOC, features) + next steps

**`generate_system_prompt`**
- Input: `templateId`, `requirements`, options (examples, constraints, verbosity)
- Output: System prompt + metadata (word count, sections) + next steps

**`generate_config_files`**
- Input: `templateId`, `agentName`, `requirements`, `recommendations`, `files[]`
- `files` options: `'agent-config'`, `'env'`, `'package'`, `'tsconfig'`, `'readme'`, `'implementation-guide'`
- Output: Object with file contents + metadata (file count, list) + next steps

#### Module Usage
```typescript
import {
  CodeGenerator,
  PromptGenerator,
  ConfigGenerator,
  createGenerateAgentCodeTool,
  createGenerateSystemPromptTool,
  createGenerateConfigFilesTool
} from './lib/generation';

// Create tools for Claude Agent SDK
const codeTool = createGenerateAgentCodeTool();
const promptTool = createGenerateSystemPromptTool();
const configTool = createGenerateConfigFilesTool();

// Or use generators directly
const codeGen = new CodeGenerator();
const code = codeGen.generateFullCode({
  templateId: 'data-analyst',
  agentName: 'SalesAnalyzer',
  includeComments: true,
  includeErrorHandling: true
});

const promptGen = new PromptGenerator();
const prompt = promptGen.generateDetailed({
  templateId: 'data-analyst',
  requirements: {...}
});

const configGen = new ConfigGenerator();
const files = {
  'package.json': configGen.generatePackageJSON(options),
  '.env.example': configGen.generateEnvFile(options),
  'README.md': configGen.generateREADME(options),
  'IMPLEMENTATION.md': configGen.generateImplementationGuide(options)
};
```

## Complete Advisor Workflow

The agent advisor follows this end-to-end workflow using all four modules:

### Phase 1: Interview (Requirements Gathering)
**Tool:** `ask_interview_question`
- Start session → Collect 15 answers across 4 stages
- Output: Complete `AgentRequirements` object

### Phase 2: Classification (Template Matching)
**Tool:** `classify_agent_type`
- Input: `AgentRequirements` from interview
- Scoring: Analyze all 5 templates with multi-factor scoring
- Output: `AgentRecommendations` with:
  - Best template match + confidence score
  - Up to 3 alternative templates
  - Customized system prompt
  - Required dependencies and MCP servers
  - Complexity assessment (low/medium/high)
  - Implementation roadmap (8-12 steps)

### Phase 3: Generation (Project Creation)
**Tools:** `generate_agent_code`, `generate_system_prompt`, `generate_config_files`
- Generate complete TypeScript implementation
- Customize system prompt with requirements
- Create all project configuration files
- Output: Production-ready agent project

### Phase 4: Export (Package & Deliver)
**Module:** `src/lib/export/` ✅ (Completed)
- `generate_implementation_guide` tool for detailed setup instructions
- Implementation guide generator with phase-based checklists
- Deployment and testing guidance

### ✅ Phase 5 - Main Advisor Agent (Completed)
The main advisor agent orchestrates the entire workflow through streaming tool calls.

#### Core Components

**1. Advisor Agent (`src/advisor-agent.ts`)**
- **`createAdvisorMcpServer()`** - Registers all 6 tools via MCP server
  - Uses `createSdkMcpServer()` from Claude Agent SDK v0.1.30
  - Server name: `'advisor-tools'`
  - Tools: interview, classification, generation (3), export
- **`runAdvisor(query)`** - Streaming query handler
  - Configures MiniMax environment (base URL, API key)
  - Creates MCP server instance
  - Streams responses with real-time console output
  - Event handling: assistant messages, tool use, errors
- **System Prompt** - Comprehensive 67-line prompt defining:
  - Workflow phases (interview → classify → generate)
  - Tool usage guidelines
  - Template knowledge (5 templates)
  - Best practices and interaction style

**2. Interactive CLI (`src/cli.ts`)**
- **`AdvisorCLI`** class for session management
  - Commands: `/help`, `/exit`, `/clear`, `/history`, `/save`, `/load`, `/status`, `/templates`
  - Query handler with streaming mode
  - Fallback to batch pipeline when streaming unavailable
  - Session persistence integration
- **Usage modes:**
  ```bash
  npm run cli                                    # Interactive mode
  npm run cli "I want to build a data agent"    # Single query mode
  node dist/advisor-agent.js "your query"       # Direct execution
  ```

**3. MCP Architecture**
The advisor uses the Model Context Protocol (MCP) for tool registration:
- Tools created with `tool()` function (Zod schemas)
- Registered via `createSdkMcpServer({ name, tools })`
- Passed to `query()` via `options.mcpServers`
- SDK handles tool execution and result streaming
- No direct tool array in options (different from standard Anthropic SDK)

**4. Environment Configuration**
Required in `.env`:
- `MINIMAX_JWT_TOKEN` - MiniMax API key (JWT format, validated)
- `CLI_PATH` - Optional Claude CLI path
- `LOG_LEVEL` - Logging verbosity (default: `info`)
- `NODE_ENV` - Environment mode (default: `development`)

## Implementation Notes
- Use `getMinimaxConfig()` from `src/utils/minimax-config.ts` to standardize MiniMax access.
- Validate incoming data with helpers in `src/utils/validation.ts` before persisting or generating outputs.
- Extend shared types in `src/types/` rather than scattering new interfaces across the codebase.
- **Module Exports:**
  - Interview: `src/lib/interview/index.ts`
  - Classification: `src/lib/classification/index.ts`
  - Generation: `src/lib/generation/index.ts`
  - Templates: `src/templates/index.ts`
- Session data persists in `sessions/` directory (gitignored).
- All template tools use JSON-serializable configurations (no Zod schemas in runtime data).
- Import paths use `.js` extensions for ESM compatibility with `module: "NodeNext"`.
- **Template Spec Compliance:** All templates strictly follow the MVP spec defined in `agent_advisor_mvp-plan.md`. The Data Analyst template schema was updated to remove nested objects (`parseOptions`, `config`, `options`), align field names/types, and ensure classifier/generator compatibility. Never deviate from spec schemas without updating the plan document first.

## Available Tools Summary

| Phase | Tool Name | Purpose | Input | Output |
|-------|-----------|---------|-------|--------|
| Interview | `ask_interview_question` | Gather requirements | action, sessionId?, response? | Question or requirements |
| Classification | `classify_agent_type` | Recommend template | AgentRequirements | AgentRecommendations + alternatives |
| Generation | `generate_agent_code` | Create implementation | templateId, agentName, options | TypeScript code |
| Generation | `generate_system_prompt` | Customize prompt | templateId, requirements, options | System prompt markdown |
| Generation | `generate_config_files` | Create project files | templateId, agentName, requirements | Config file contents |
| Export | `generate_implementation_guide` | Create setup guide | templateId, agentName, requirements | Implementation guide markdown |

All tools are registered via MCP server and follow Claude Agent SDK patterns with:
- Zod input schemas for type safety and validation
- Structured JSON outputs with status, data, and next steps
- Comprehensive error handling with context details
- Tool metadata (descriptions, permissions)
- Registered through `createSdkMcpServer()` in advisor agent

## Quality Checklist
- ✅ Run `npm run build` and relevant tests prior to handoff.
- ✅ Keep `.env`-sensitive values out of version control; rely on `.env.example` updates if new variables emerge.
- ✅ Document non-obvious decisions in code comments or commit messages.
- ✅ Update `README.md` and this guide when new capabilities or workflows are introduced.

Stay aligned with the project roadmap, communicate blockers early, and leave the workspace ready for the next agent to continue seamlessly.
