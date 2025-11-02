# Agent Onboarding Guide

Welcome to the Agent Advisor MiniMax MVP. This document gives future coding agents a concise overview of the project goals, setup steps, and expectations for each development phase.

## Mission Overview
- Build an advisor agent that interviews developers, classifies their needs, and generates comprehensive planning documents for Claude Agent SDK implementation targeting the MiniMax API.
- Maintain strict adherence to the five core templates defined in the Phase 1 plan until the roadmap specifies otherwise.
- Output is a single Markdown planning document with 8 standardized sections providing actionable implementation guidance.

## Setup Checklist
1. Review `agent_advisor_mvp-plan.md` for architectural details, timelines, and template specifications.
2. Read the SDK primers in `Agent SDK Primers/` to align with approved integration patterns.
3. Install dependencies: `npm install`.
4. Copy `.env.example` to `.env` and populate:
   - `MINIMAX_JWT_TOKEN` — required MiniMax JWT credential.
   - `CLI_PATH` — optional local Claude CLI path for advanced tooling.
   - `LOG_LEVEL` (default `info`) and `NODE_ENV` (default `development`).
   - `MAX_MESSAGE_LENGTH` — optional thinking block truncation length (default `300`, range `50-1000`).
   - `CLEAR_SCREEN` — optional console clearing on CLI startup (default `true`, accepts `true/false/1/0/yes/no`).
5. Verify TypeScript builds with `npm run build` before committing changes.

## Project Layout
```
src/
├── templates/            # 5 agent document templates (documentation-focused)
│   ├── index.ts          # Template registry with lookup functions
│   ├── template-types.ts # DocumentTemplate, DocumentSection types
│   ├── sections/         # Standardized documentation sections
│   │   └── index.ts      # SECTION_TEMPLATES (8 standardized sections)
│   ├── data-analyst.ts   # Data Analyst document template
│   ├── content-creator.ts # Content Creator document template
│   ├── code-assistant.ts # Code Assistant document template
│   ├── research-agent.ts # Research Agent document template
│   └── automation-agent.ts # Automation Agent document template
├── lib/
│   ├── interview/        # Interview flow logic with session management
│   ├── classification/   # Template matching engine
│   ├── documentation/    # Planning document generator
│   └── export/           # (legacy utilities, not used in main workflow)
├── types/                # Shared TypeScript definitions
└── utils/                # Configuration + validation helpers

tests/                    # Vitest suites (184/184 documentation tests passing)
├── fixtures/             # Sample requirements and responses
├── utils/                # Test helpers and utilities
│   ├── test-helpers.ts   # Temp dirs, TypeScript compilation, JSON validation
│   ├── markdown-validator.ts  # Markdown parsing and validation
│   └── e2e-helpers.ts    # E2E test wrappers for generators
├── unit/                 # Module-level tests
│   └── documentation/    # Documentation generator tests (123/123 passing)
│       ├── document-generator.test.ts  # PlanningDocumentGenerator tests (78 tests)
│       └── planning-tool.test.ts       # MCP tool handler tests (45 tests)
├── integration/          # Multi-module workflow tests
├── validation/           # TypeScript compilation checks
└── e2e/                  # End-to-end workflow tests
    ├── document-generation.test.ts     # Documentation workflow E2E (61/61 passing)
    ├── advisor-workflow.test.ts
    ├── conversation-state.test.ts
    ├── conversation-state-simple.test.ts
    └── markdown-output-validation.test.ts

sessions/                 # Interview session persistence (gitignored)
examples/                 # Reference implementations
```

## Scripts
- `npm run dev` — Watch-mode development via `tsx`.
- `npm run build` — TypeScript compilation with declaration output.
- `npm run test` — Vitest test runner (add coverage as features land).
- `npm run test:e2e` — Run end-to-end workflow tests.
- `npm start` — Execute the compiled advisor agent from `dist/`.

## E2E Testing Infrastructure

### Markdown Validator (`tests/utils/markdown-validator.ts`)
Comprehensive utilities for parsing and validating Markdown outputs:
- `parseMarkdownDocument()` — Parse into structured components (sections, code blocks, metadata)
- `validateMarkdownStructure()` — Validate required elements (headers, code fences, copy instructions)
- `extractCodeFromMarkdown()` — Extract code blocks by language tag
- `extractFileMapping()` — Map file headers to code content
- `validateCodeBlock()` — Validate individual code blocks

### E2E Test Helpers (`tests/utils/e2e-helpers.ts`)
Simplified wrappers for testing planning document generation without full MCP setup:
- `generatePlanningDocument()` — Wraps `PlanningDocumentGenerator` for E2E tests
- Returns structured results for validation in test scenarios

All functions return validation-ready output for test assertions.

### E2E Test Suite
- **`advisor-workflow.test.ts`** — Complete workflow from interview to planning document, all 5 templates
- **`conversation-state.test.ts`** — Session persistence, resume flow, and multi-session handling
- **`conversation-state-simple.test.ts`** — Conversation metadata tracking (10/10 passing)
- **`markdown-output-validation.test.ts`** — Markdown structure validation for planning documents
- **`document-generation.test.ts`** — Documentation workflow E2E (61/61 passing)

### Documentation Module Test Suite (184/184 passing - 100%)

**Unit Tests - PlanningDocumentGenerator (78 tests)**
- `tests/unit/documentation/document-generator.test.ts`
- Validates document generation for all 5 templates
- Verifies all 8 required sections (Overview, Requirements, Architecture, Phases, Security, Metrics, Risk, Deployment)
- Checks heading hierarchy (H1 title, H2 sections)
- Ensures no code blocks or code-like patterns in documentation output
- Tests section ordering and content substantiveness
- Covers edge cases: empty steps, no MCP servers, minimal/complex requirements

**Unit Tests - Planning Tool Handler (45 tests)**
- `tests/unit/documentation/planning-tool.test.ts`
- Validates MCP tool configuration and handler
- Tests input validation for all parameters (templateId, agentName, requirements, recommendations)
- Verifies Markdown-wrapped output format (file headers, code fences, copy instructions)
- Checks error handling and Markdown error formatting
- Ensures successful generation for all 5 templates
- Validates Next Steps section presence

**E2E Tests - Documentation Workflow (61 tests)**
- `tests/e2e/document-generation.test.ts`
- Tests complete workflow: Requirements → Classification → Planning Document
- Validates cross-template consistency (structure, heading hierarchy, sections)
- Ensures unique content per template
- Tests edge cases with minimal and complex requirements
- Validates integration between classifier and generator
- Verifies no code blocks in final output

## Implementation Status

### ✅ Phase 1 - Interview Module (Completed)
The interview module has been fully implemented and includes:

#### Core Components
1. **Questions System** (`src/lib/interview/questions.ts`)
   - 15 comprehensive questions across 4 stages (discovery, requirements, architecture, output)
   - Supports text, choice, boolean, and multiselect question types
   - Configurable required/optional fields with hints
   - **Export Aliases**: `QUESTIONS` alias for backward compatibility with tests (line 177)

2. **State Management** (`src/lib/interview/state-manager.ts`)
   - `InterviewStateManager` class for session lifecycle management
   - Automatic response-to-requirements mapping
   - Stage progression with completion tracking
   - Resume capability for interrupted sessions
   - **New Methods** (lines 110-132):
     - `getRequirements()` - Alias to `getCollectedRequirements()`
     - `getProgress()` - Returns progress object with `currentStage`, `currentQuestionIndex`, `totalQuestions`, `completionPercentage`

3. **Validation** (`src/lib/interview/validator.ts`)
   - Zod-based type-safe validation
   - Question-specific response validation
   - Stage completion verification
   - Complete requirements validation
   - **Validation Results**: All functions return `{ success, data?, errors }` format (array-based errors)

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

**Parameters:**
- `action`: `"start"` | `"answer"` | `"skip"` | `"resume"` | `"status"` (required)
- `sessionId`: Session identifier (optional, required for answer/skip/resume/status actions)
- `response`: Answer to current question (optional, required for answer action; can be string, boolean, or array of strings)

**Return Format:** JSON object with session state, next question, or completion status

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

### ✅ Phase 2 - Agent Document Templates (Completed)
Five comprehensive document templates have been implemented with standardized documentation structure and implementation guidance.

**IMPORTANT TRANSFORMATION**: Templates have been converted from code-generation format to **documentation templates** that provide comprehensive implementation guidance.

#### Document Template Overview

| Template ID | Name | Sections | Focus Areas |
|------------|------|----------|-------------|
| `data-analyst` | Data Analyst Agent | 8 | CSV processing, statistical analysis, visualization, reporting |
| `content-creator` | Content Creator Agent | 8 | Content generation, SEO optimization, multi-platform formatting |
| `code-assistant` | Code Assistant Agent | 8 | Code review, refactoring, test generation, quality analysis |
| `research-agent` | Research Agent | 8 | Web search, content extraction, fact-checking, source verification |
| `automation-agent` | Automation Agent | 8 | Task scheduling, workflow orchestration, queue management |

#### Document Template Structure

Each template contains:
1. **8 Standardized Sections**:
   - Overview (purpose, capabilities, use cases, prerequisites)
   - Architecture (system design, components, patterns)
   - Implementation (project structure, tool specs, configuration)
   - Testing (strategy, unit/integration/E2E tests, fixtures)
   - Deployment (environment setup, build process, deployment options)
   - Monitoring (metrics, logging, alerting, dashboards)
   - Troubleshooting (common issues, debugging, resolutions)
   - Maintenance (regular tasks, updates, optimization)

2. **Planning Checklist**: Pre-implementation items to consider
3. **Architecture Patterns**: Recommended architectural approaches
4. **Risk Considerations**: Potential risks and mitigation strategies
5. **Success Criteria**: Measurable success indicators
6. **Implementation Guidance**: Step-by-step implementation instructions

#### Template Files and Content

All template files have been converted to document templates. Each file exports a `*DocumentTemplate` constant:

**Files:**
- `src/templates/data-analyst.ts` → `dataAnalystDocumentTemplate`
- `src/templates/content-creator.ts` → `contentCreatorDocumentTemplate`
- `src/templates/code-assistant.ts` → `codeAssistantDocumentTemplate`
- `src/templates/research-agent.ts` → `researchAgentDocumentTemplate`
- `src/templates/automation-agent.ts` → `automationAgentDocumentTemplate`

**What Changed:**
- ❌ **Removed**: Tool schema definitions, system prompts, starter code, dependency lists
- ✅ **Added**: 8 standardized documentation sections with comprehensive guidance
- ✅ **Added**: Planning checklists, architecture patterns, risk considerations
- ✅ **Added**: Success criteria, implementation guidance (step-by-step)

**Example: Data Analyst Document Template**
```typescript
import { dataAnalystDocumentTemplate } from './src/templates/data-analyst.js';

// Access documentation sections
console.log(dataAnalystDocumentTemplate.documentSections.overview);
console.log(dataAnalystDocumentTemplate.documentSections.implementation);

// Access guidance
console.log(dataAnalystDocumentTemplate.planningChecklist);
console.log(dataAnalystDocumentTemplate.architecturePatterns);
console.log(dataAnalystDocumentTemplate.implementationGuidance);
```

**Standardized Sections** (`src/templates/sections/index.ts`):
All templates use the same 8 section templates as a base, then customize with agent-specific content:
- `SECTION_TEMPLATES.overview` - Purpose, capabilities, use cases, prerequisites
- `SECTION_TEMPLATES.architecture` - System components, data flow, design patterns
- `SECTION_TEMPLATES.implementation` - Project structure, core modules, configuration
- `SECTION_TEMPLATES.testing` - Testing strategy, test cases, fixtures
- `SECTION_TEMPLATES.deployment` - Environment setup, build process, deployment steps
- `SECTION_TEMPLATES.monitoring` - Key metrics, logging, alerting, dashboards
- `SECTION_TEMPLATES.troubleshooting` - Common issues, debugging, resolutions
- `SECTION_TEMPLATES.maintenance` - Regular tasks, updates, optimization

#### Template System Architecture

**Core Files:**
- `src/templates/template-types.ts` - Shared types and helpers
  - `DocumentSection` interface - Section structure
  - `DocumentTemplate` interface - Template structure
  - `createDocumentTemplate()` - Document template factory with validation
  - Legacy: `AgentTemplate`, `ToolSchemaDefinition`, `createTemplate()` (deprecated)

- `src/templates/sections/index.ts` - Standardized documentation sections
  - `SECTION_TEMPLATES` - All 8 standardized sections
  - `SectionName` type - Union of section keys
  - `getSectionTemplate(name)` - Get section by name
  - `getAllSectionNames()` - Get all section keys

- `src/templates/index.ts` - Template registry and utilities
  - `ALL_DOCUMENT_TEMPLATES` - Array of all 5 document templates
  - `getDocumentTemplateById(id)` - Template lookup
  - `getDocumentTemplatesByCapability(tag)` - Filter by capability
  - `getDocumentTemplateSummaries()` - Get summaries with section counts
  - Legacy: `ALL_TEMPLATES`, `getTemplateById()` (deprecated)

**Document Template Structure:**
```typescript
interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  capabilityTags: string[];
  idealFor: string[];
  documentSections: Record<string, DocumentSection>;
  planningChecklist: string[];
  architecturePatterns: string[];
  riskConsiderations: string[];
  successCriteria: string[];
  implementationGuidance: string[];
}

interface DocumentSection {
  title: string;
  description: string;
  subsections: string[];
  contentGuidance: string[];
  examples?: string[];
}
```

#### Using Document Templates
```typescript
import {
  ALL_DOCUMENT_TEMPLATES,
  getDocumentTemplateById,
  getDocumentTemplatesByCapability,
  getDocumentTemplateSummaries,
  dataAnalystDocumentTemplate
} from './src/templates';

// Access all document templates
console.log(`${ALL_DOCUMENT_TEMPLATES.length} document templates available`);

// Get template by ID
const template = getDocumentTemplateById('data-analyst');

// Access documentation sections
console.log(template.documentSections.overview);
console.log(template.documentSections.implementation);

// Access guidance
console.log(template.planningChecklist);
console.log(template.successCriteria);

// Get summaries
const summaries = getDocumentTemplateSummaries();
// Returns: { id, name, description, sectionCount, capabilityTags }[]
```

**Legacy Code Template API (Deprecated):**
The old code-generation template API is still available for backward compatibility but marked as deprecated:
```typescript
// ⚠️ Deprecated - use document templates instead
import { ALL_TEMPLATES, getTemplateById, dataAnalystTemplate } from './src/templates';
```

#### Documentation-First Philosophy

**IMPORTANT**: The system produces Markdown-only output. The advisor never writes files directly or generates code scaffolding.

**User Workflow**:
1. User poses questions through interactive CLI or direct queries
2. Advisor generates comprehensive planning document (Markdown with 8 sections)
3. CLI detects code fences and shows copy tips
4. User runs `/save` command to launch interactive save workflow
5. User selects directory, enters filename, confirms path safety
6. Planning document saved to chosen location
7. User executes implementation plan offline with full control

**Benefits**:
- Safe, reviewable output before persistence
- Users control when and where to save
- Portable Markdown format for easy sharing
- No automated code generation drift
- Clear separation between planning and execution

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

**Parameters:**
- `requirements`: Complete AgentRequirements object from interview session (required)
- `includeAlternatives`: Whether to include alternative template recommendations (optional, default: true)

**Return Format:** JSON object (not Markdown) with detailed structure

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

### ✅ Phase 4 - Documentation Module (Completed)
The documentation module replaces code generation with a planning-first deliverable. It synthesizes interview data and classification guidance into a single Markdown brief teams can execute without additional tooling.

#### Core Components

**1. PlanningDocumentGenerator (`src/lib/documentation/document-generator.ts`)**

Transforms the chosen template, requirements, and recommendations into a narrative plan.

- Validates the agent name format and template ID.
- Summarizes primary outcomes, audiences, delivery channels, and capability expectations.
- Organizes implementation steps into three phases (Foundations, Build, Validation & Launch).
- Surfaces compliance, security, and credential considerations.
- Records risks, open questions, and deployment guidance, including MCP server setup.

**Planning Document Sections**

Every generated brief contains the mandated eight sections:
1. Overview
2. Requirements
3. Architecture
4. Phases
5. Security
6. Metrics
7. Risk
8. Deployment

Each section is written in Markdown with bullet points or ordered lists for fast reviews and stakeholder handoff.

**2. Documentation Tool (`src/lib/documentation/tool-handler.ts`)**

`createGeneratePlanningDocumentTool()` wraps the generator for MCP use:

- **Tool Name:** `generate_planning_document`
- **Input Schema:** `{ templateId, agentName, requirements, recommendations }`
- **Output:** Markdown with a single file header (`docs/planning.md`), the planning document code fence, and numbered next steps for distribution.
- **Validation:** Uses shared Zod schemas for requirements and recommendations; returns structured tool errors when inputs fail validation.

#### Module Usage
```typescript
import { PlanningDocumentGenerator, createGeneratePlanningDocumentTool } from './lib/documentation/index.js';

// Use the generator directly
const generator = new PlanningDocumentGenerator();
const markdown = generator.generate({
  templateId: 'data-analyst',
  agentName: 'Sales Insights Advisor',
  requirements,
  recommendations,
});

// Register the MCP tool
const planningTool = createGeneratePlanningDocumentTool();
```

## Complete Advisor Workflow

The advisor now follows a streamlined three-phase process focused on requirements and documentation:

### Phase 1: Interview (Requirements Gathering)
**Tool:** `ask_interview_question`
- Start a new session and collect all 15 responses across four stages.
- Output: Complete `AgentRequirements` object, validated and ready for scoring.

### Phase 2: Classification (Template Matching)
**Tool:** `classify_agent_type`
- Input: `AgentRequirements` from the interview.
- Scoring: Evaluates all five templates, producing confidence, reasoning, and implementation steps.
- Output: `AgentRecommendations` with dependencies, MCP server suggestions, complexity, and roadmap guidance.

### Phase 3: Documentation (Planning Deliverable)
**Tool:** `generate_planning_document`
- Input: Template selection, requirements, and recommendations.
- Output: A single Markdown planning brief that consolidates architecture, phases, security, and deployment guidance for human execution.

### ✅ Phase 5 - Main Advisor Agent (Completed)
The main advisor agent orchestrates the entire workflow through streaming tool calls.

#### Core Components

**1. Advisor Agent (`src/advisor-agent.ts`)**
- **`createAdvisorMcpServer()`** - Registers three documentation-focused tools via MCP server
  - Uses `createSdkMcpServer()` from Claude Agent SDK v0.1.30
  - Server name: `'advisor-tools'`
  - Tools: interview, classification, planning document
- **`runAdvisor(query, options?)`** - Streaming query handler with session tracking
  - **NEW**: Accepts `options?: { sessionId?: string; continueSession?: boolean }`
  - **NEW**: Returns `Promise<{ sessionId: string | null }>` for conversation continuity
  - Captures session ID from streamed messages for multi-turn conversations
  - Configures MiniMax environment (base URL, API key)
  - Creates MCP server instance
  - Streams responses with real-time console output
  - Event handling: assistant messages, tool use, errors
- **System Prompt** - Comprehensive 67-line prompt defining:
  - Workflow phases (interview → classify → document)
  - Tool usage guidelines
  - Template knowledge (5 templates)
  - Best practices and interaction style

**2. Interactive CLI (`src/cli.ts`)**
- **`AdvisorCLI`** class for session management with conversation context tracking
  - Commands: `/help`, `/exit`, `/clear`, `/history`, `/save`, `/load [sessionId]`, `/status`, `/templates`
  - **NEW Session Tracking**:
    - `currentAdvisorSessionId` - Tracks advisor conversation session ID
    - `conversationMessageCount` - Counts messages in current conversation
    - `conversationStartTime` - Timestamps conversation start
  - **NEW Automatic Session Resume** (`attemptSessionResume()`):
    - Loads most recent session on CLI startup
    - Restores conversation metadata (session ID, message count, timestamps)
    - Displays session info to user
  - **Enhanced `/load` Command**:
    - Lists available sessions when called without argument
    - Loads specific session by ID with full metadata restoration
    - Displays message count, start time, last activity
    - Persists state immediately after loading
  - **Conversation Context Persistence** (`persistConversationState()`):
    - Saves conversation metadata after each query
    - Updates `lastActivity` timestamp on interactions
    - Integrates with `InterviewStateManager.updateConversationMetadata()`
  - **Output Capture**: Automatically captures all streamed responses
  - **Code Fence Detection**: Shows tip message when code blocks are detected
  - **Interactive Save Workflow** (`/save` command):
    - **Directory Selection**: Choose current dir, create new, enter custom path, or select from available directories
    - **Directory Filtering**: Excludes hidden dirs, `node_modules`, `dist`, `build`, `.git`, `sessions`
    - **Directory Sanitization**: Removes invalid chars, replaces spaces with hyphens, clamps length (1-100)
    - **Filename Input**: Prompts with timestamped default (e.g., `advisor-output-2025-11-02.md`)
    - **Path Safety**: Validates against traversal, absolute paths, escaping project root
    - **Overwrite Protection**: Confirms before overwriting existing files
    - **Success Feedback**: Displays saved path and file size
    - **Helper Methods** (`src/cli.ts:494-684`):
      - `prompt(message)` - Generic input prompt using `pendingConfirmation` pattern
      - `listDirectories(dirPath)` - Lists filtered directories
      - `createNewDirectory(baseDir, name)` - Creates sanitized directories
      - `selectDirectory()` - Interactive directory selection menu
      - `saveWithDirectorySelection()` - Complete save workflow with validation
  - Query handler with streaming mode and session tracking
  - Fallback to batch pipeline when streaming unavailable
  - Session persistence integration
- **Usage modes:**
  ```bash
  npm run cli                                    # Interactive mode
  npm run cli "I want to build a data agent"    # Single query mode
  node dist/advisor-agent.js "your query"       # Direct execution
  ```
- **Output Workflow:**
  1. User poses a question to start or continue the engagement.
  2. Advisor streams Markdown-formatted planning guidance in real time.
  3. CLI detects code fences and shows copy tips for the generated brief.
  4. User runs `/save` (interactive workflow):
     - Select directory (current, create new, custom path, or from list)
     - Enter filename (or use timestamped default)
     - Confirm overwrite if file exists
     - Path safety validation and confirmation if needed
  5. Delivery team executes the documented plan offline.

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
- `MAX_MESSAGE_LENGTH` - Optional thinking block truncation length (default: `300`, range: `50-1000`)
- `CLEAR_SCREEN` - Optional console clearing on CLI startup (default: `true`, accepts: `true/false/1/0/yes/no`)

**5. Thinking Block Truncation** (`src/advisor-agent.ts:12-53`)
The advisor implements smart truncation for MiniMax-M2 thinking blocks:
- **Algorithm**: Preserves first 67% and last 33% of text with `...` separator
- **Configurable**: Set via `MAX_MESSAGE_LENGTH` environment variable
- **Default**: 300 characters (upgradeable from previous 80-char hardcoded limit)
- **Valid Range**: 50-1000 characters with automatic clamping
- **Helper Functions**:
  - `getMaxMessageLength()` - Validates and returns configured max length
  - `truncateMessage(text, maxLength)` - Applies smart 2:1 truncation algorithm
- **Applied To**: All three thinking block streaming event handlers

**6. Console Screen Clearing** (`src/cli.ts:11-29, 553-561, 569-574`)
The interactive CLI provides configurable screen clearing on startup:
- **Default Behavior**: Screen clears on startup for clean interactive experience
- **Environment Variable**: `CLEAR_SCREEN` controls default behavior
  - Accepts: `true/false`, `1/0`, `yes/no` (case-insensitive)
  - Default: `true` when not set or unrecognized value
- **CLI Flag Override**: `--no-clear` flag takes precedence over environment variable
  - Usage: `npm run cli -- --no-clear`
- **TTY Guard**: Clearing only occurs when `process.stdout.isTTY` is true
  - Protects non-interactive sessions from side effects
  - Single-query mode never clears screen
- **Helper Function**: `shouldClearScreen()` parses environment variable
- **Constructor Parameter**: `AdvisorCLI` accepts optional `clearScreen?: boolean`
- **Precedence**: CLI flag > Environment variable > Default (true)

## Implementation Notes
- Use `getMinimaxConfig()` from `src/utils/minimax-config.ts` to standardize MiniMax access.
- Validate incoming data with helpers in `src/utils/validation.ts` before persisting or generating outputs.
- Extend shared types in `src/types/` rather than scattering new interfaces across the codebase.
- **Module Exports:**
  - Interview: `src/lib/interview/index.ts`
  - Classification: `src/lib/classification/index.ts`
  - Documentation: `src/lib/documentation/index.ts`
  - Templates: `src/templates/index.ts`
- Session data persists in `sessions/` directory (gitignored).
- **Conversation Metadata** (`src/types/interview.ts:29-34`):
  - `ConversationMetadata` interface tracks advisor session continuity
  - Fields: `advisorSessionId`, `messageCount`, `lastActivity`, `conversationStarted`
  - Optional fields in `InterviewState` and `PersistedState` for backward compatibility
  - **State Manager Methods** (`src/lib/interview/state-manager.ts`):
    - `updateConversationMetadata(metadata: ConversationMetadata)` - Update tracking
    - `getConversationMetadata()` - Retrieve current metadata
    - `getRequirements()` - Alias to `getCollectedRequirements()` for convenience
    - `getProgress()` - Returns progress object with stage, index, totals, percentage
  - **Persistence** (`src/lib/interview/persistence.ts`):
    - Serializes dates as ISO strings in saved sessions
    - Deserializes dates when loading sessions
    - Backward compatible with legacy sessions (metadata is optional)
  - **Tool Integration** (`src/lib/interview/tool-handler.ts`):
    - Initializes metadata on session start
    - Updates `lastActivity` on answer/resume actions
    - Persists state after metadata updates
- **Validation Pattern** (`src/lib/interview/validator.ts`):
  - All validators return `ValidationResult<T>` with array-based errors
  - Format: `{ success: boolean, data?: T, errors?: string[] }`
  - Use `result.errors` (array) not `result.error` (deprecated)
  - Tests updated to match actual error message patterns
- **Test Compatibility** (`src/lib/interview/questions.ts:177`):
  - `QUESTIONS` export alias for backward compatibility with existing tests
  - Primary export remains `INTERVIEW_QUESTIONS`
- All template tools use JSON-serializable configurations (no Zod schemas in runtime data).
- Import paths use `.js` extensions for ESM compatibility with `module: "NodeNext"`.
- **Template Spec Compliance:** All templates strictly follow the MVP spec defined in `agent_advisor_mvp-plan.md`. The Data Analyst template schema was updated to remove nested objects (`parseOptions`, `config`, `options`), align field names/types, and ensure classifier/generator compatibility. Never deviate from spec schemas without updating the plan document first.
- **Markdown-Only Output:** The `generate_planning_document` tool returns Markdown, not JSON. Never introduce file operations or non-Markdown responses; the system prompt forbids Bash/Write/Edit actions. Users persist deliverables via the interactive CLI `/save` command.
- **Task Management Tools Prohibited:** TodoWrite, TodoRead, TodoUpdate, and all task management tools are explicitly forbidden in the advisor's system prompt. These tools create false expectations that the advisor will execute tasks rather than provide documentation. The advisor outputs Markdown documentation with numbered lists for implementation steps. If tasks fail or cannot be executed, the advisor must explicitly clear/cancel any presented todos and replace them with numbered Markdown next-steps lists for users to follow.

## Recent Improvements

### 2025-11-02: Interactive Save Workflow Enhancement
**Focus**: Replace command-line argument save with fully interactive directory and filename selection

#### Implementation Details (`src/cli.ts`)
- ✅ **New Helper Methods**:
  - `prompt(message)` (lines 494-506) - Generic input prompt using `pendingConfirmation` pattern for consistent user input handling
  - `listDirectories(dirPath)` (lines 511-525) - Lists directories with filtering (excludes hidden, `node_modules`, `dist`, `build`, `.git`, `sessions`)
  - `createNewDirectory(baseDir, name)` (lines 530-568) - Creates directories with name sanitization:
    - Trims whitespace, replaces spaces with hyphens
    - Removes invalid characters (keeps only alphanumeric, hyphens, underscores)
    - Strips leading/trailing dots and hyphens
    - Clamps length to 1-100 characters
    - Handles already-exists gracefully (EEXIST)
  - `selectDirectory()` (lines 573-612) - Interactive directory selection menu:
    - Option 1: Use current directory
    - Option 2: Create new directory (with sanitization)
    - Option 3: Enter custom path
    - Options 4+: Select from available directories list
  - `saveWithDirectorySelection()` (lines 617-684) - Complete interactive save workflow:
    - Validates `lastOutput` exists
    - Calls `selectDirectory()` for directory choice
    - Prompts for filename with timestamped default (e.g., `advisor-output-2025-11-02.md`)
    - Auto-appends `.md` extension if missing
    - Path safety validation (detects traversal, absolute paths, escaping project root)
    - Confirms before overwriting existing files
    - Displays success feedback (path and file size)

- ✅ **Command Handler Update** (line 220):
  - Changed `/save` from `await this.saveSession(args)` to `await this.saveWithDirectorySelection()`
  - No longer accepts command-line arguments
  - Fully interactive workflow

- ✅ **Removed Legacy Code**:
  - Removed `saveSession(args)` method entirely (previously lines 479-541)
  - Eliminated command-line argument parsing for filename
  - Cleaned up dead code paths

- ✅ **Documentation Updates**:
  - Updated help text: `/save <filename>` → `/save` (interactive)
  - Updated output capture tip: `/save <filename>` → `/save`
  - Updated workflow example in help text
  - Updated CLAUDE.md with complete workflow documentation
  - Updated agents.md with helper method details and workflow steps

#### Benefits
- ✅ **Better User Experience**: Guided interactive prompts instead of memorizing syntax
- ✅ **Organized Output**: Easy directory creation and selection for project organization
- ✅ **Safer Paths**: Continued path safety validation with user confirmation
- ✅ **Prevents Overwrites**: Explicit confirmation before overwriting files
- ✅ **Flexible Defaults**: Timestamped filenames prevent accidental name collisions
- ✅ **Cleaner Codebase**: Removed legacy argument parsing, single responsibility methods
- ✅ **Consistent UX**: All prompts use same `pendingConfirmation` pattern

### 2025-11-02: TodoWrite Prohibition Enhancement
**Focus**: Prevent task management tool usage that conflicts with Markdown-only output philosophy

#### System Prompt Updates (`src/advisor-agent.ts`)
- ✅ **PROHIBITED TOOLS Expansion**: Added TodoWrite, TodoRead, TodoUpdate, and "any task management tools" to prohibited list
- ✅ **Explanatory Note**: Added rationale explaining that task management tools are incompatible with advisor's Markdown-only deliverables and create false expectations of execution
- ✅ **New "Task Management and Workflow" Subsection** in Best Practices:
  - Never use TodoWrite or any task management tools
  - Output is documentation only, users implement themselves
  - Provide numbered Markdown next steps instead of todos
  - Use Markdown ordered lists (1., 2., 3.) for implementation steps
  - If task fails or cannot execute: explicitly clear/cancel todos and replace with Markdown lists
- ✅ **Enhanced "Provide Complete Solutions" Guideline**: Added explicit prohibition of TodoWrite tasks and reinforcement that output is documentation for users to implement

#### Documentation Updates
- ✅ **CLAUDE.md**: Added "Task Management Prohibition" section in Implementation Notes (lines 245-250)
- ✅ **agents.md**: Added "Recent Improvements" section documenting the enhancement

#### Benefits
- ✅ Prevents advisor from creating false expectations of task execution
- ✅ Reinforces Markdown-only documentation philosophy throughout system prompt
- ✅ Provides clear guidance on proper alternatives (numbered Markdown lists)
- ✅ Handles failure cases explicitly (clear todos, provide user-actionable lists)
- ✅ Improves consistency between advisor behavior and system architecture

### 2025-11-02: Comprehensive Tool Documentation Enhancement
**Focus**: Complete tool reference with accurate parameters, return formats, and implementation paths

#### Documentation Updates
- ✅ **System Prompt Corrections** (`src/advisor-agent.ts`):
  - **ask_interview_question Tool**:
    - Corrected actions list: `start`, `answer`, `skip`, `resume`, `status`
    - Removed invalid actions: `ask`, `complete` (never existed in implementation)
    - Fixed parameter descriptions: `action` (required), `sessionId` (optional), `response` (optional)
    - Clarified return format: JSON object with session state
  - **classify_agent_type Tool**:
    - Fixed parameters: `requirements` (AgentRequirements), `includeAlternatives` (default: true)
    - Corrected return format: JSON object (not Markdown) with complete structure
    - Added structure description: status, classification, recommendations, alternatives, nextSteps
- ✅ **New Tool Reference Quick Guide** (CLAUDE.md lines 259-295, agents.md lines 929-998):
  - Comprehensive reference section for all 6 tools
  - Detailed sections for each tool with purpose, parameters, return format, implementation path
  - Clear distinction between JSON outputs (interview, classification) and Markdown outputs (generation, export)
  - Action descriptions for interview tool (start, answer, skip, resume, status)
  - Parameter optionality and requirements clearly marked
  - File paths for easy code navigation
- ✅ **Enhanced Available Tools Summary Table** (agents.md line 1000+):
  - Updated input column with complete parameter lists and types
  - Clarified output format column with detailed structure for JSON tools
  - More accurate and descriptive tool specifications
- ✅ **Documentation Files Updated**:
  - `src/advisor-agent.ts` - System prompt Available Tools section (lines 117-152)
  - `CLAUDE.md` - Tool output format (lines 237-243), quick guide (lines 259-295), recent updates (lines 405-443)
  - `agents.md` - Interview flow (lines 97-148), classification tool (lines 353-383), quick guide (lines 929-998), summary table (lines 1000+), recent improvements (lines 884+)

#### Benefits
- ✅ **Prevents Tool Hallucination**: Accurate documentation matches actual implementations
- ✅ **Improved Developer Onboarding**: Centralized tool reference for quick lookup
- ✅ **Better Agent Behavior**: Advisor agent uses correct parameters and understands return formats
- ✅ **Easier Code Navigation**: Implementation file paths included in documentation
- ✅ **Clear Output Format Distinction**: Developers understand JSON vs Markdown outputs
- ✅ **Comprehensive Coverage**: All 6 tools fully documented with parameters, returns, and usage

### 2025-11-02: Thinking Block Truncation Enhancement
**Focus**: Smart truncation with configurable length for better thinking block visibility

#### Implementation Details
- ✅ **Smart Truncation Algorithm**: 2:1 split preserving beginning (67%) and end (33%) of text
  - Example: Long text becomes `"Start of message...end of message"` instead of just `"Start of message..."`
  - Applied to all three thinking block streaming sites in `src/advisor-agent.ts`
- ✅ **Configurable Length**: `MAX_MESSAGE_LENGTH` environment variable
  - Default: 300 characters (upgraded from 80-char hardcoded limit)
  - Valid range: 50-1000 with automatic clamping
  - Parsing and validation handles invalid/missing values gracefully
- ✅ **Centralized Helpers**: Eliminated code duplication
  - `getMaxMessageLength()` - Single source of truth for max length configuration
  - `truncateMessage(text, maxLength)` - Reusable truncation logic with JSDoc
  - Replaced three separate inline truncation blocks
- ✅ **Documentation Updates**:
  - `.env.example` - Added comprehensive MAX_MESSAGE_LENGTH documentation with examples
  - `CLAUDE.md` - Documented truncation system in architecture and recent updates
  - `agents.md` - Added thinking block truncation section with algorithm details

#### Benefits
- ✅ Better visibility into agent reasoning with configurable truncation
- ✅ Preserves context from both start and end of thinking blocks
- ✅ User control via environment variable for different use cases
- ✅ Cleaner codebase with centralized helper functions
- ✅ Production-safe with validation and clamping

### 2025-11-02: Documentation Generator Test Coverage
**Focus**: Comprehensive test suite for planning document generation workflow

#### Test Infrastructure Created
- ✅ **Unit Tests - PlanningDocumentGenerator** (78 tests):
  - Created `tests/unit/documentation/document-generator.test.ts`
  - Validates document generation for all 5 templates (Data Analyst, Content Creator, Code Assistant, Research Agent, Automation Agent)
  - Verifies all 8 required sections present and ordered correctly (Overview, Requirements, Architecture, Phases, Security, Metrics, Risk, Deployment)
  - Checks heading hierarchy (H1 title, H2 sections)
  - Ensures no code blocks or code-like patterns in documentation-only output
  - Tests edge cases: empty implementation steps, no MCP servers, minimal/complex requirements
  - Validates error handling for invalid template IDs and agent names

- ✅ **Unit Tests - Planning Tool Handler** (45 tests):
  - Created `tests/unit/documentation/planning-tool.test.ts`
  - Validates MCP tool configuration (name, description, handler)
  - Tests comprehensive input validation for all parameters
  - Verifies Markdown-wrapped output format (file headers, code fences, copy instructions)
  - Checks error handling and Markdown error formatting
  - Ensures successful generation for all 5 templates
  - Validates Next Steps section presence and structure

- ✅ **E2E Tests - Documentation Workflow** (61 tests):
  - Created `tests/e2e/document-generation.test.ts`
  - Tests complete workflow: Requirements → Classification → Planning Document Generation
  - Validates cross-template consistency (all templates produce same structure)
  - Ensures unique content per template
  - Tests edge cases with minimal and complex requirements
  - Validates integration between AgentClassifier and PlanningDocumentGenerator
  - Verifies no code blocks in final documentation output

#### Legacy Template Compatibility
- ✅ **Added AgentTemplate Exports**: Added backward-compatible legacy exports to all 5 template files
  - `dataAnalystTemplate` in `src/templates/data-analyst.ts`
  - `contentCreatorTemplate` in `src/templates/content-creator.ts`
  - `codeAssistantTemplate` in `src/templates/code-assistant.ts`
  - `researchAgentTemplate` in `src/templates/research-agent.ts`
  - `automationAgentTemplate` in `src/templates/automation-agent.ts`
  - Enables PlanningDocumentGenerator to access required fields (capabilityTags, recommendedIntegrations)
  - Maintains compatibility with existing classification and generation workflows

#### Test Results
- ✅ **All Documentation Tests Passing**: 184/184 (100%)
- ✅ **Coverage Areas**: Section structure, heading hierarchy, code block absence, edge cases, error handling, cross-template consistency
- ✅ **Benefits**: Ensures planning documents maintain consistent quality, validates documentation-first workflow, prevents code generation drift

### 2025-11-02: Export Test Refactoring
**Focus**: Eliminated test flakiness, improved reliability, better documentation

#### Code Quality Improvements
- ✅ **Removed DRY Violations**: Centralized file-existence checks using shared `waitForFileExists()` helper
  - Removed duplicate `verifyFileExists()` from `packager.test.ts`
  - Removed local `waitForFile()` from `file-writer.test.ts`
  - All tests now use `tests/utils/test-helpers.ts::waitForFileExists()`
- ✅ **Eliminated Redundant Retry Logic**: Simplified test cleanup
  - Removed outer retry loops wrapping `cleanupTempDirectory()` calls
  - Helper function already implements retry logic internally
  - Kept minimal pre-cleanup delays (50ms file-writer, 150ms packager)
- ✅ **Replaced Fixed Delays with Condition-Based Waits**:
  - Packager: Use `waitForFileExists(packageJsonPath, 2000)` as sentinel after `packageAgent()`
  - File writer: Use `waitForFileExists()` for copy operations and multi-file writes
  - List files: Poll for last file instead of fixed 100ms sleep
  - Benefits: Faster test execution, reduced race conditions

#### Test Robustness Enhancements
- ✅ **Added try/finally for Spy Restoration** (`packager.test.ts:165-210`):
  - Guaranteed cleanup of mocks even when tests fail early
  - Prevents test pollution and intermittent failures
  - Pattern: `try { /* test */ } finally { spy.mockRestore(); restore state; }`
- ✅ **Fixed Compilation Error**: Removed duplicate `packageJsonPath` declaration

#### Documentation Improvements
- ✅ **Documented Vitest Parallelism Config** (`vitest.config.ts`):
  - Explained why `fileParallelism: false` is necessary (race conditions in temp directory ops)
  - Clarified `concurrent: false` and `shuffle: false` rationale
  - Added TODO for scoping non-parallel settings to export tests only
  - Clear path forward for re-enabling parallelism after stabilization

#### Test Results
- ✅ **Documentation Tests**: 184/184 passing (100%) - comprehensive coverage added
  - Unit tests for PlanningDocumentGenerator: 78/78 passing
  - Unit tests for planning tool handler: 45/45 passing
  - E2E documentation workflow tests: 61/61 passing
- ✅ **Export Tests**: 20/20 passing (100%) - fully stabilized (retired in favor of documentation-first workflow)
- ✅ **Unit Tests Overall**: See individual module test suites
- **Note**: Legacy export suite retired; focus shifted to documentation-first workflow

### 2025-11-01: Test Suite Fixes
**Focus**: Validation system alignment and API improvements

#### Test Suite Fixes
- ✅ Added `QUESTIONS` export alias for test compatibility
- ✅ Fixed all validator test assertions to use `result.errors` array
- ✅ Updated test expectations to match actual error messages
- ✅ Added convenience methods to `InterviewStateManager`: `getRequirements()`, `getProgress()`
- ✅ Test pass rate improved from 74/112 (66%) to 92/112 (82%)

#### Validation System Enhancements
- ✅ Consistent error handling across all validators
- ✅ Array-based error format for better error collection
- ✅ Improved error messages with clear context
- ✅ Better alignment between validators and tests

#### State Manager Improvements
- ✅ `getRequirements()` - Cleaner API for accessing collected requirements
- ✅ `getProgress()` - Structured progress tracking with percentage calculation
- ✅ Better support for progress monitoring and UI integration

## Tool Reference

For complete tool documentation including parameter specifications, return formats, error codes, workflow examples, and troubleshooting guidance, see **[TOOLS.md](./TOOLS.md)**.

### Quick Reference

**3 Tools in Workflow**:
1. **`ask_interview_question`** - Interactive interview (JSON) - `src/lib/interview/tool-handler.ts`
2. **`classify_agent_type`** - Template matching (JSON) - `src/lib/classification/tool-handler.ts`
3. **`generate_planning_document`** - Planning brief (Markdown) - `src/lib/documentation/tool-handler.ts`

**Output Format Key**:
- **JSON**: Interview and classification (structured data)
- **Markdown**: Planning brief (single code fence with copy instructions)

See [TOOLS.md](./TOOLS.md) for detailed specifications.

## Available Tools Summary

| Phase | Tool Name | Purpose | Input | Output Format |
|-------|-----------|---------|-------|---------------|
| Interview | `ask_interview_question` | Gather requirements | action (start\|answer\|skip\|resume\|status), sessionId?, response? | JSON (questions/requirements) |
| Classification | `classify_agent_type` | Recommend template | requirements (AgentRequirements), includeAlternatives? (default: true) | JSON (status, classification, recommendations, alternatives, nextSteps) |
| Documentation | `generate_planning_document` | Produce planning brief | templateId, agentName, requirements, recommendations | **Markdown** single-file planning document |

### Output Format Notes

**Planning Document Tool**:
- **Code Fence**: Uses ```markdown for the entire brief.
- **File Header**: Always emits `### File: docs/planning.md`.
- **Copy Instructions**: Follows the fence with `**To use**: Copy the above Markdown to docs/planning.md`.
- **Next Steps**: Ends with numbered guidance for handoff.
- **Error Format**: Failures render Markdown with `## Error` headings and troubleshooting tips.

All tools are registered via MCP server and follow Claude Agent SDK patterns with:
- Zod input schemas for type safety and validation
- Markdown-formatted outputs for documentation tooling
- JSON outputs for interview/classification tools

## Quality Checklist
- ✅ Run `npm run build` and relevant tests prior to handoff.
- ✅ Keep `.env`-sensitive values out of version control; rely on `.env.example` updates if new variables emerge.
- ✅ Document non-obvious decisions in code comments or commit messages.
- ✅ Update `README.md` and this guide when new capabilities or workflows are introduced.

Stay aligned with the project roadmap, communicate blockers early, and leave the workspace ready for the next agent to continue seamlessly.
