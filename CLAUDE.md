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

### ✅ Phase 2 - Agent Templates (Completed)
Five production-ready agent templates have been implemented with complete tool definitions, system prompts, and starter code:

#### 1. Data Analyst Template (`src/templates/data-analyst.ts`)
**Purpose:** CSV data processing, statistical analysis, and report generation

**Tools:**
- `read_csv` - Parse CSV files with top-level parameters: `filePath`, `delimiter`, `hasHeaders`, `encoding` (utf8/utf16le/latin1)
- `analyze_data` - Descriptive, correlation, regression, and distribution analysis with optional `columns` and `groupBy` parameters
- `generate_visualization` - Create bar, line, scatter, pie, histogram, heatmap charts with required `xAxis` and `yAxis` parameters
- `export_report` - Generate reports in JSON, CSV, Markdown, or HTML formats with `data`, `format`, `outputPath`, and `includeMetadata` parameters

**Capabilities:** `data-processing`, `statistics`, `visualization`, `reporting`, `file-access`

**Schema Changes (2025-01-XX):**
- `read_csv`: Removed nested `parseOptions`, all parameters now top-level; encoding restricted to `['utf8','utf16le','latin1']`
- `analyze_data`: Removed `options` object (confidenceLevel, roundDecimals); added `groupBy` parameter; changed `z.any()` to `z.unknown()`
- `generate_visualization`: Removed nested `config` object; `xAxis` and `yAxis` now required; removed non-spec fields (color, width, height); permissions changed from `['file:write','compute']` to `['file:write']`
- `export_report`: Replaced complex `reportData` structure with simple `data` parameter; removed `pdf` format; default changed to `'markdown'`; added `includeMetadata` boolean

#### 2. Content Creator Template (`src/templates/content-creator.ts`)
**Purpose:** Blog posts, documentation, marketing copy, and SEO optimization

**Tools:**
- `generate_outline` - Create structured content outlines by type and audience
- `write_section` - Write sections with specified tone, style, and perspective
- `optimize_for_seo` - Optimize content with keyword density and readability analysis
- `format_content` - Format for WordPress, Medium, GitHub, LinkedIn, or generic platforms

**Capabilities:** `content-creation`, `writing`, `seo`, `marketing`, `documentation`

#### 3. Code Assistant Template (`src/templates/code-assistant.ts`)
**Purpose:** Code review, debugging, refactoring, and test generation

**Tools:**
- `analyze_code` - Analyze quality, security, performance, complexity, patterns, best practices
- `suggest_improvements` - Provide prioritized, actionable improvements with examples
- `generate_tests` - Generate unit/integration tests with edge cases and mocks
- `refactor_code` - Refactor with goals like extract-function, simplify, remove-duplication

**Capabilities:** `code-review`, `testing`, `refactoring`, `debugging`, `quality-assurance`

#### 4. Research Agent Template (`src/templates/research-agent.ts`)
**Purpose:** Web search, content extraction, fact-checking, and source verification

**Tools:**
- `web_search` - Search with date range, domain filtering, and language options
- `scrape_content` - Extract content from URLs with CSS selectors
- `extract_facts` - Extract statistics, claims, quotes, dates, entities, relationships
- `verify_sources` - Verify credibility with cross-referencing and bias assessment

**Capabilities:** `research`, `web-search`, `fact-checking`, `summarization`, `web-access`

#### 5. Automation Agent Template (`src/templates/automation-agent.ts`)
**Purpose:** Task orchestration, workflow automation, and scheduled execution

**Tools:**
- `schedule_task` - Schedule tasks with cron expressions, retries, and notifications
- `execute_workflow` - Execute multi-step workflows with conditional logic
- `monitor_status` - Monitor task/workflow status with history, logs, and metrics
- `manage_queue` - Manage queues with priority, concurrency, and rate limiting

**Capabilities:** `automation`, `orchestration`, `scheduling`, `workflows`, `task-management`

#### Template System Features
- **Shared Type System** (`src/templates/template-types.ts`)
  - `TemplateCategory` and `ToolSchemaDefinition` types
  - `convertToolSchemaToConfig()` - Converts Zod schemas to JSON-serializable tool configs
  - `createTemplate()` - Factory function for creating AgentTemplate instances

- **Template Registry** (`src/templates/index.ts`)
  - `ALL_TEMPLATES` array with all 5 templates
  - `getTemplateById(id)` - Lookup templates by ID
  - `getTemplatesByCapability(tag)` - Filter templates by capability
  - `getAllCapabilityTags()` - Get all unique capability tags
  - `TEMPLATE_COUNT` and `TEMPLATE_CATEGORIES` constants

#### Template Usage
```typescript
import {
  ALL_TEMPLATES,
  getTemplateById,
  dataAnalystTemplate,
  contentCreatorTemplate,
  codeAssistantTemplate,
  researchAgentTemplate,
  automationAgentTemplate
} from './src/templates';

// Access all templates
console.log(`${ALL_TEMPLATES.length} templates available`);

// Get specific template
const template = getTemplateById('data-analyst');
console.log(template.name); // "Data Analyst Agent"
console.log(template.defaultTools.length); // 4 tools

// Each template includes:
// - id, name, description
// - capabilityTags, idealFor
// - systemPrompt (comprehensive role definition)
// - defaultTools (JSON-serializable ToolConfiguration[])
// - requiredDependencies, recommendedIntegrations
```

### ✅ Phase 3 - Classification Module (Completed)
The classification module analyzes interview requirements and recommends the best template match:

#### Core Components
1. **AgentClassifier** (`src/lib/classification/classifier.ts`)
   - `classify()` - Main classification with full recommendations
   - `scoreAllTemplates()` - Scores all templates against requirements
   - `scoreTemplate()` - Individual template scoring (max 100 points)
     - Capability matching (40 pts), use case alignment (30 pts)
     - Interaction style (15 pts), capability requirements (15 pts)
   - `generateMCPServers()` - Recommends MCP servers (web-fetch, filesystem, memory, etc.)
   - `customizeSystemPrompt()` - Personalizes template prompts with requirements
   - `assessComplexity()` - Evaluates as low/medium/high based on tools and capabilities
   - `generateImplementationSteps()` - Creates detailed implementation roadmap

2. **Tool Integration** (`src/lib/classification/tool-handler.ts`)
   - Claude Agent SDK tool: `classify_agent_type`
   - Input: Full `AgentRequirements` from interview
   - Output: Primary recommendation + confidence score + up to 3 alternatives
   - Includes tools, dependencies, MCP servers, complexity, and implementation steps

#### Module Usage
```typescript
import { AgentClassifier, createClassifyAgentTypeTool } from './lib/classification';

// Create tool for SDK
const classifyTool = createClassifyAgentTypeTool();

// Or use classifier directly
const classifier = new AgentClassifier();
const recommendations = classifier.classify(requirements);
console.log(recommendations.agentType); // 'data-analyst'
console.log(recommendations.estimatedComplexity); // 'medium'
```

### ✅ Phase 4 - Generation Module (Completed)
The generation module creates complete agent projects from templates and requirements:

#### Core Components
1. **CodeGenerator** (`src/lib/generation/code-generator.ts`)
   - `generateFullCode()` - Complete TypeScript implementation
   - Generates: imports, utilities, tool implementations, agent initialization, main function
   - Options: include comments, error handling, sample usage
   - Creates working agent.ts ready for customization

2. **PromptGenerator** (`src/lib/generation/prompt-generator.ts`)
   - `generate()` - Customized system prompts
   - Sections: header, role, capabilities, objectives, constraints, guidelines, examples, metrics
   - Verbosity levels: concise, standard, detailed
   - `generateConcise()` and `generateDetailed()` convenience methods
   - Personalizes template prompts with agent name, audience, outcomes, constraints

3. **ConfigGenerator** (`src/lib/generation/config-generator.ts`)
   - `generateAgentConfigJSON()` - Agent configuration file
   - `generateEnvFile()` - Environment variables with template-specific settings
   - `generatePackageJSON()` - Complete package.json with dependencies
   - `generateTSConfig()` - TypeScript configuration
   - `generateREADME()` - Project documentation
   - `generateImplementationGuide()` - Detailed implementation roadmap with checklists

4. **Tool Integration** (`src/lib/generation/tool-handlers.ts`)
   - `generate_agent_code` - Code generation tool
   - `generate_system_prompt` - Prompt generation tool
   - `generate_config_files` - Configuration generation tool
   - All tools return structured outputs with metadata and next steps

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

// Create tools for SDK
const codeTool = createGenerateAgentCodeTool();
const promptTool = createGenerateSystemPromptTool();
const configTool = createGenerateConfigFilesTool();

// Or use generators directly
const codeGen = new CodeGenerator();
const code = codeGen.generateFullCode({
  templateId: 'data-analyst',
  agentName: 'MyAgent',
  includeComments: true
});

const promptGen = new PromptGenerator();
const prompt = promptGen.generate({
  templateId: 'data-analyst',
  requirements,
  verbosityLevel: 'detailed'
});

const configGen = new ConfigGenerator();
const packageJson = configGen.generatePackageJSON({
  templateId: 'data-analyst',
  agentName: 'MyAgent',
  requirements
});
```

## Implementation Notes
- Use `getMinimaxConfig()` from `src/utils/minimax-config.ts` to standardize MiniMax access.
- Validate incoming data with helpers in `src/utils/validation.ts` before persisting or generating outputs.
- Extend shared types in `src/types/` rather than scattering new interfaces across the codebase.
- Interview module exports are available via `src/lib/interview/index.ts` barrel file.
- Classification module exports are available via `src/lib/classification/index.ts` barrel file.
- Generation module exports are available via `src/lib/generation/index.ts` barrel file.
- Template module exports are available via `src/templates/index.ts` barrel file.
- Session data persists in `sessions/` directory (gitignored).
- All template tools use JSON-serializable configurations (no Zod schemas in runtime data).
- Import paths use `.js` extensions for ESM compatibility.
- **Template Spec Compliance:** All templates follow exact MVP spec schemas. The Data Analyst template was updated to remove nested objects and align field names, types, and defaults with the specification in `agent_advisor_mvp-plan.md`.

### ✅ Phase 5 - Main Advisor Agent (Completed)
The main advisor agent orchestrates the entire workflow through streaming tool calls:

#### Core Components
1. **Advisor Agent** (`src/advisor-agent.ts`)
   - `createAdvisorMcpServer()` - Creates MCP server with all 6 tools registered
   - `runAdvisor(query)` - Streaming query handler with real-time console output
   - MCP Architecture: Tools registered via `createSdkMcpServer()` from Claude Agent SDK v0.1.30
   - Environment: Auto-configures MiniMax base URL and API key from `.env`
   - Streaming Events: Handles assistant messages, tool calls, and errors

2. **Interactive CLI** (`src/cli.ts`)
   - `AdvisorCLI` class for interactive sessions
   - Commands: `/help`, `/exit`, `/clear`, `/history`, `/save`, `/load`, `/status`, `/templates`
   - Query Mode: Streams responses from advisor agent
   - Fallback Mode: Batch pipeline execution when streaming unavailable
   - Session Management: Save/load interview sessions

#### Available Tools (Registered via MCP)
The advisor agent workflow uses these tools in sequence:

1. **Interview Phase**
   - `ask_interview_question` - Conducts interactive interview (start, answer, skip, resume, status)
   - Collects `AgentRequirements` across 15 questions in 4 stages

2. **Classification Phase**
   - `classify_agent_type` - Analyzes requirements and recommends template
   - Returns `AgentRecommendations` with complexity scores and alternatives

3. **Generation Phase**
   - `generate_agent_code` - Creates TypeScript implementation
   - `generate_system_prompt` - Customizes system prompt
   - `generate_config_files` - Generates project files (package.json, .env, README, etc.)
   - `generate_implementation_guide` - Creates detailed setup and deployment guide

All tools follow Claude Agent SDK patterns with Zod schemas and structured JSON outputs.

#### Usage
```bash
# Interactive mode (recommended)
npm run cli

# Single query mode
npm run cli "I want to build a data analysis agent"

# Direct execution (requires build first)
npm run build && node dist/advisor-agent.js "your query"
```

#### System Prompt
The advisor follows a comprehensive system prompt that:
- Guides developers through structured interview → classification → generation workflow
- Explains template recommendations with confidence scores
- Provides complete, production-ready solutions
- Includes implementation guidance and next steps
- Maintains professional, educational interaction style

## Quality Checklist
- ✅ Run `npm run build` and relevant tests prior to handoff.
- ✅ Keep `.env`-sensitive values out of version control; rely on `.env.example` updates if new variables emerge.
- ✅ Document non-obvious decisions in code comments or commit messages.
- ✅ Update `README.md` and this guide when new capabilities or workflows are introduced.

Stay aligned with the project roadmap, communicate blockers early, and leave the workspace ready for the next agent to continue seamlessly.
