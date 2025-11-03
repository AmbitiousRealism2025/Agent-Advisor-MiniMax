# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission Overview

Build an advisor agent that interviews developers, classifies needs, and generates comprehensive planning documents for Claude Agent SDK implementation targeting the MiniMax API. The output is a single Markdown planning document with 8 sections providing actionable implementation guidance.

### TUI-MVP Branch: Terminal UI Enhancement

**IMPORTANT**: This branch (TUI-MVP) is dedicated to enhancing the terminal user interface with improved visual design and user experience. The focus is on refining the look and feel of the existing CLI while maintaining all core functionality.

**Next Phase**: Develop a modern Terminal User Interface (TUI) that improves the visual presentation and interaction patterns of the current CLI, making the advisor agent more intuitive and visually appealing in terminal environments.

## Essential Commands

### Development Workflow
```bash
npm install           # Install dependencies
npm run build         # Compile TypeScript (dist/) + make CLI executable
npm run dev           # Watch-mode development (tsx)
npm start             # Run compiled advisor from dist/
npm run cli           # Interactive CLI (recommended)
npm run advisor       # Direct advisor agent execution
```

### CLI Usage
```bash
# Local development
npm run cli                         # Start interactive CLI
npm run cli -- --no-clear           # Start without clearing screen

# After building
./dist/cli.js                       # Run built CLI directly

# Global installation
npm install -g agent-advisor-mvp
agent-advisor                       # Run from anywhere

# Using npx
npx agent-advisor-mvp               # Run without installation
```

### Testing
```bash
npm test                  # Run all tests with Vitest
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # End-to-end tests (all 5 templates)
npm run test:validation   # TypeScript compilation validation
npm run test:coverage     # Generate coverage report
npm run test:watch        # Watch mode for development
npm run test:ui           # Interactive Vitest UI
```

### Single Test Execution
```bash
# Run specific test file
npx vitest run tests/unit/interview/state-manager.test.ts

# Run tests matching pattern
npx vitest run -t "should validate"

# Watch specific file
npx vitest watch tests/unit/classification/classifier.test.ts
```

## Architecture Overview

### Core System: Agent-Built Agent Builder

The advisor itself is built using the Claude Agent SDK and creates a **streaming conversational workflow**:

1. **Interview Phase** → `ask_interview_question` tool
2. **Classification Phase** → `classify_agent_type` tool
3. **Documentation Phase** → `generate_planning_document` tool

### MCP Integration

The advisor uses **MCP (Model Context Protocol)** via `createSdkMcpServer()` to register all tools. This enables:
- Streaming responses with real-time console output
- Tool call orchestration through the MiniMax API
- **Markdown-formatted tool results** with code blocks and copy instructions
- Zod validation for all tool inputs

### Output Format: Markdown-Only

**CRITICAL**: The advisor **NEVER** writes files directly. All documentation outputs are formatted as Markdown:

- **Tool Result**: `generate_planning_document` returns a single Markdown planning document with 8 standardized sections (Overview, Requirements, Architecture, Phases, Security, Metrics, Risk, Deployment).
- **No File Operations**: System prompt explicitly forbids Bash, Write, Edit, or any file operations.
- **User Workflow**: Users receive Markdown output → use `/save` command (interactive) → execute the plan manually.
- **Benefits**: Safe, reviewable, portable output that users control when and where to persist.

### Session Management & Conversation Context

**NEW**: The system now maintains conversation continuity across sessions:

**Session Tracking** (`src/advisor-agent.ts:152-155`):
- `runAdvisor()` accepts `options?: { sessionId?: string; continueSession?: boolean }`
- Returns `{ sessionId: string | null }` to track advisor session ID
- Captures session ID from streamed messages for conversation continuity
- Enables multi-turn conversations with proper context retention

**Conversation Metadata** (`src/types/interview.ts:29-34`):
- `advisorSessionId` - Links interview session to advisor conversation
- `messageCount` - Tracks total messages in conversation
- `lastActivity` - Timestamp of last interaction
- `conversationStarted` - Timestamp when conversation began

**Automatic Session Resume** (`src/cli.ts:42-74`):
- CLI automatically loads the most recent session on startup
- Restores conversation state, metadata, and session ID
- Displays session info (message count, start time, last activity)
- Seamless continuation of previous conversations

**State Persistence** (`src/lib/interview/persistence.ts`):
- All session state saved to `sessions/` directory as JSON
- Conversation metadata serialized with proper date handling
- Backward compatible with legacy sessions (optional metadata fields)
- Automatic cleanup of sessions older than 7 days

**Key Architectural Patterns**

**Streaming Events** (`src/advisor-agent.ts`):
- `assistant:message` - Agent responses
- `tool:use` - Tool invocations
- `thinking` - Extended reasoning blocks (MiniMax-M2) with smart truncation
- `error` - Error handling

**Thinking Block Truncation** (`src/advisor-agent.ts:12-53`):
- **Smart Truncation Algorithm**: Preserves beginning and end of thinking text
  - Keeps first 67% and last 33% of allowed length
  - Example: `"This is a long thinking block message"` → `"This is a long th...king block message"`
- **Configurable Length**: Set via `MAX_MESSAGE_LENGTH` environment variable
  - Default: 300 characters
  - Valid range: 50-1000 characters
  - Auto-clamping to safe range
- **Helper Functions**:
  - `getMaxMessageLength()` - Reads and validates env variable
  - `truncateMessage(text, maxLength)` - Applies 2:1 smart truncation
- **Applied to Three Sites**: content_block_start thinking, content_block_delta thinking_delta, final thinking block

**Module Organization**:
- `src/lib/interview/` - Interactive interview state machine with session management
- `src/lib/classification/` - Template matching and scoring engine
- `src/lib/documentation/` - Planning document generator and MCP tool
- `src/lib/export/` - FileWriter utilities (legacy packaging support)
- `src/templates/` - 5 agent document templates with comprehensive implementation guidance
- `src/templates/sections/` - 8 standardized documentation sections (overview, architecture, implementation, testing, deployment, monitoring, troubleshooting, maintenance)

## Interactive CLI Commands

When running `npm run cli`, the following commands are available:

```
/help              - Show available commands
/exit, /quit       - Exit the CLI
/clear             - Clear console screen
/history           - Show conversation history
/save              - Save last advisor output to Markdown file (interactive)
/load [name]       - Load saved interview session
/status            - Show current interview progress
/templates         - List all available agent templates
```

**Query Mode**: Any input that doesn't start with `/` is treated as a query and streamed to the advisor agent.

**Output Capture & Interactive Save**: The CLI automatically captures all advisor responses. When code blocks are detected:
- Visual separator and tip message appears
- Use `/save` to launch interactive save workflow
- File saved with full Markdown formatting for easy copy-paste

**Interactive Save Workflow** (`src/cli.ts:617-684`):
1. **Directory Selection**: Choose from current directory, create new directory, enter custom path, or select from available directories
2. **Filename Input**: Enter filename or use timestamped default (e.g., `advisor-output-2025-11-02.md`)
3. **Path Safety Validation**: Detects path traversal, absolute paths, or paths escaping project root
4. **Overwrite Confirmation**: Prompts before overwriting existing files
5. **Success Feedback**: Displays saved file path and size

**Helper Methods**:
- `listDirectories(dirPath)` - Lists non-hidden directories, excludes `node_modules`, `dist`, `build`, `.git`, `sessions`
- `createNewDirectory(baseDir, name)` - Sanitizes and creates directories (removes invalid chars, clamps length)
- `selectDirectory()` - Interactive directory selection with numbered menu
- `prompt(message)` - Generic prompt helper using `pendingConfirmation` pattern
- `saveWithDirectorySelection()` - Complete interactive save workflow with validation

**Session Management**:
- `/load` - List all available sessions or load a specific session by ID
- Automatic session resume on CLI startup (loads most recent session)
- Session metadata includes: message count, start time, last activity
- Conversation context preserved across CLI restarts

**Fallback Mode**: If streaming fails, the CLI falls back to batch pipeline execution.

## Environment Configuration

### Required Variables
```env
MINIMAX_JWT_TOKEN=your_jwt_token_here  # Required for MiniMax API access
```

### Optional Variables
```env
CLI_PATH=/Users/username/.claude/local/claude  # Optional Claude CLI path
LOG_LEVEL=info                                  # Logging level (default: info)
NODE_ENV=development                            # Environment (default: development)
MAX_MESSAGE_LENGTH=300                          # Thinking block truncation length (default: 300, range: 50-1000)
CLEAR_SCREEN=true                               # Clear console on CLI startup (default: true, accepts: true/false/1/0/yes/no)
```

### CLI Flags
```bash
npm run cli                 # Interactive mode with default settings
npm run cli -- --no-clear   # Interactive mode, preserve terminal history (disable screen clearing)
npm run cli -- -i           # Explicitly enable interactive mode
```

**Screen Clearing Behavior**:
- **Default**: CLI clears screen on startup for clean interactive experience
- **Environment Variable**: Set `CLEAR_SCREEN=false` to preserve terminal output
- **CLI Flag Override**: `--no-clear` flag takes precedence over environment variable
- **TTY Guard**: Clearing only occurs in interactive TTY sessions, never in non-interactive mode
- **Implementation**: `src/cli.ts:11-29` (helper), `src/cli.ts:553-561` (start method), `src/cli.ts:569-574` (flag parsing)

### MiniMax Configuration Pattern
```typescript
import { getMinimaxConfig } from './src/utils/minimax-config.js';

const config = getMinimaxConfig();
// Returns: { baseUrl: 'https://api.minimax.io/anthropic', apiKey: process.env.MINIMAX_JWT_TOKEN }
// Validation powered by minimaxEnvSchema in src/utils/validation.ts
```

## Project Structure

```
src/
├── advisor-agent.ts      # Main advisor with MCP server setup
├── cli.ts                # Interactive CLI with session management
├── templates/            # 5 agent document templates
│   ├── index.ts          # Template registry with lookup functions
│   ├── template-types.ts # Shared types (AgentTemplate, DocumentTemplate, createDocumentTemplate)
│   ├── sections/         # Standardized documentation sections
│   │   └── index.ts      # SECTION_TEMPLATES (8 standardized sections)
│   ├── data-analyst.ts   # Data Analyst document template
│   ├── content-creator.ts # Content Creator document template
│   ├── code-assistant.ts # Code Assistant document template
│   ├── research-agent.ts # Research Agent document template
│   └── automation-agent.ts # Automation Agent document template
├── lib/
│   ├── interview/        # State machine, questions, validation, persistence
│   ├── classification/   # AgentClassifier with scoring algorithm
│   ├── documentation/    # Planning document generator and MCP tool
│   └── export/           # (legacy utilities, not used in main workflow)
├── types/                # Shared TypeScript interfaces
└── utils/                # minimax-config.ts, validation.ts

tests/
├── fixtures/             # Sample requirements and responses
├── utils/                # Test helpers and factory functions
│   ├── test-helpers.ts   # Temp dirs, TypeScript compilation, JSON validation
│   ├── markdown-validator.ts  # Markdown parsing and validation utilities
│   └── e2e-helpers.ts    # E2E test wrappers for generators
├── unit/                 # Module-level tests
├── integration/          # Multi-module workflow tests
├── validation/           # TypeScript compilation checks
└── e2e/                  # End-to-end workflow tests
    ├── advisor-workflow.test.ts
    ├── conversation-state.test.ts
    ├── conversation-state-simple.test.ts
    ├── markdown-output-validation.test.ts
    └── code-compilation-validation.test.ts

sessions/                 # Interview session persistence (gitignored)
examples/                 # Reference implementations
```

## E2E Testing Infrastructure

### Markdown Validator (`tests/utils/markdown-validator.ts`)

Comprehensive Markdown parsing and validation utilities:

```typescript
import {
  parseMarkdownDocument,      // Parse Markdown into structured components
  validateMarkdownStructure,  // Validate required elements (headers, code blocks, etc.)
  extractCodeFromMarkdown,    // Extract code blocks by language
  extractFileMapping,         // Map file headers to code content
  validateCodeBlock,          // Validate individual code blocks
} from '../utils/markdown-validator.js';
```

**Key Features**:
- Regex-based parsing for sections, code blocks, file headers
- Validates file headers: `### File: \`filename\``
- Validates code fences with language tags: ` ```typescript `
- Validates copy instructions: `**To use**: Copy...`
- Returns structured validation results with errors and warnings

### Planning Document Validation
- `tests/utils/markdown-validator.ts` remains available for parsing Markdown outputs and verifying file headers, code fences, and copy instructions.
- Use these helpers when adding regression tests for `generate_planning_document`.

## Five Agent Document Templates

**IMPORTANT**: Templates have been transformed from code-generation to **documentation templates**. Each template provides comprehensive implementation guidance across eight standardized sections.

1. **Data Analyst** (`data-analyst`) - CSV processing, statistics, visualization, reporting
2. **Content Creator** (`content-creator`) - Blog posts, SEO optimization, multi-platform formatting
3. **Code Assistant** (`code-assistant`) - Code review, refactoring, test generation, debugging
4. **Research Agent** (`research-agent`) - Web search, content extraction, fact-checking, source verification
5. **Automation Agent** (`automation-agent`) - Task scheduling, workflow orchestration, queue management

### Document Template Structure

Each document template contains:
- **8 Standardized Sections**: Overview, Architecture, Implementation, Testing, Deployment, Monitoring, Troubleshooting, Maintenance
- **Planning Checklist**: Pre-implementation checklist items
- **Architecture Patterns**: Recommended architectural approaches
- **Risk Considerations**: Potential risks and mitigation strategies
- **Success Criteria**: Measurable success indicators
- **Implementation Guidance**: Step-by-step implementation instructions

### Accessing Templates

```typescript
// New document template API (recommended)
import {
  ALL_DOCUMENT_TEMPLATES,
  getDocumentTemplateById,
  getDocumentTemplatesByCapability,
  getDocumentTemplateSummaries,
  dataAnalystDocumentTemplate
} from './src/templates';

// Legacy code template API (deprecated)
import { ALL_TEMPLATES, getTemplateById } from './src/templates';
```

### Template Registry Functions

**Document Templates** (current):
- `ALL_DOCUMENT_TEMPLATES` - Array of all 5 document templates
- `getDocumentTemplateById(id)` - Lookup by ID
- `getDocumentTemplatesByCapability(tag)` - Filter by capability tag
- `getDocumentTemplateSummaries()` - Returns `{ id, name, description, sectionCount, capabilityTags }[]`

**Code Templates** (deprecated):
- `ALL_TEMPLATES` - ⚠️ Deprecated, use `ALL_DOCUMENT_TEMPLATES`
- `getTemplateById(id)` - ⚠️ Deprecated, use `getDocumentTemplateById(id)`
- `getTemplatesByCapability(tag)` - ⚠️ Deprecated, use `getDocumentTemplatesByCapability(tag)`
- `getTemplateSummaries()` - ⚠️ Deprecated, use `getDocumentTemplateSummaries()`

## Implementation Notes

### ESM Module System
- All imports use `.js` extensions for ESM compatibility
- `"type": "module"` in package.json
- Use `import` syntax, not `require()`

### Type Safety
- All templates use JSON-serializable configurations (no Zod schemas in runtime data)
- Convert Zod schemas to JSON via `convertToolSchemaToConfig()` from `src/templates/template-types.ts`
- Use Zod for validation, not runtime type checking

### Tool Output Format
- **Planning document tool returns Markdown**: `generate_planning_document` outputs a Markdown document with file header and copy instructions.
- **Interview and classification tools return JSON**: `ask_interview_question` and `classify_agent_type` emit structured JSON objects.
- **Code Fences**: Use proper language tags (`markdown` for planning doc, `json` for errors).
- **File Headers**: Each Markdown output includes `### File: docs/planning.md`.
- **Copy Instructions**: Markdown outputs end with `**To use**: Copy the above...`
- **Error Format**: Errors are returned as Markdown with `## Error` headings and troubleshooting sections.

### Task Management Prohibition
- **Never use TodoWrite or task management tools**: The advisor outputs documentation only, not executable task lists
- **TodoWrite, TodoRead, TodoUpdate are prohibited**: These tools create false expectations of execution
- **Use numbered Markdown lists instead**: Present implementation steps as ordered lists (1., 2., 3.) in Markdown format
- **User workflow**: Users receive Markdown documentation and implement steps themselves
- **If tasks fail or are not executable**: Explicitly clear/cancel any presented todos and replace with numbered Markdown next-steps lists

### Session Persistence & Conversation Context
- Sessions stored in `sessions/` directory (gitignored)
- Automatic cleanup after 7 days
- Use `src/lib/interview/persistence.ts` for save/load operations
- **Conversation Metadata**: Each session tracks advisor session ID, message count, and activity timestamps
- **State Manager Methods**:
  - `updateConversationMetadata(metadata: ConversationMetadata)` - Update conversation tracking
  - `getConversationMetadata()` - Retrieve current conversation metadata
- **CLI Integration**: Session tracking integrated into interactive CLI for seamless multi-session conversations
- **Backward Compatibility**: Metadata fields are optional to support legacy sessions without conversation tracking

### Template Spec Compliance
**CRITICAL**: All templates must match exact MVP spec schemas in `agent_advisor_mvp-plan.md`. No nested parameter objects - all parameters must be top-level for Claude Agent SDK compatibility.

## Tool Reference

For complete tool documentation including parameter specifications, return formats, error codes, and usage examples, see **[TOOLS.md](./TOOLS.md)**.

### Quick Summary

**3 Tools Available**:
1. **`ask_interview_question`** - Interactive interview workflow (JSON output)
2. **`classify_agent_type`** - Template matching and recommendations (JSON output)
3. **`generate_planning_document`** - Comprehensive planning brief (Markdown output)

**Key Distinction**:
- Interview & classification tools return **JSON** with structured data
- Documentation tool returns **Markdown** with a structured planning brief

See [TOOLS.md](./TOOLS.md) for detailed specifications, parameters, return formats, and error handling.

## Troubleshooting

### Build Errors
```bash
# Clean build
rm -rf dist/
npm run build

# Check TypeScript errors without emitting
npx tsc --noEmit
```

### Test Status
Current test suite status:
- **All documentation tests passing**: 184/184 tests (100%)
  - Unit tests: `tests/unit/documentation/document-generator.test.ts` (78 tests)
  - Unit tests: `tests/unit/documentation/planning-tool.test.ts` (45 tests)
  - E2E tests: `tests/e2e/document-generation.test.ts` (61 tests)
- See `TESTING_NOTES.md` for any remaining issues in other test suites
- Recent additions: Comprehensive documentation generator test coverage with code block absence verification, section ordering validation, and edge case handling

### MiniMax Connection Issues
```bash
# Verify JWT token is set
echo $MINIMAX_JWT_TOKEN

# Test with simple query
npm run cli
> "Hello, can you help me build an agent?"
```

## Git Workflow

**IMPORTANT**: All development happens on `dev` branch.

### Before Starting Work
```bash
git checkout dev
git pull origin dev
git branch  # Verify you're on dev
git status  # Check for uncommitted changes
```

### Commit Message Format
```
Brief description of changes

- Detailed bullet points
- Specific modules/files affected
- Breaking changes or new features

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Branching Strategy
- `main` - Production-ready releases only (no direct commits)
- `dev` - Active development (default branch)
- `feature/*` - Optional for major features (branch from dev, merge back to dev)

## Session Initialization Checklist

**REQUIRED at start of every session**:

1. **Check Testing Notes**: Read `TESTING_NOTES.md` for documented issues
2. **Ask User**: "Would you like to address any items from TESTING_NOTES.md?"
3. **Review Priorities**:
   - 🔴 High: Message truncation, test failures
   - 🟡 Medium: Output format & file generation
   - 🟢 Low: Terminal screen management
4. **Plan Session**: Incorporate user's priority choices into work plan

## Quality Standards

### Before Committing
- ✅ Run `npm run build` (must succeed)
- ✅ Run `npm test` (review any new failures)
- ✅ Check no sensitive data in `.env` (use `.env.example` for templates)
- ✅ Update `CLAUDE.md` if architecture changes
- ✅ Update `TESTING_NOTES.md` if new issues discovered

### Code Standards
- Use `getMinimaxConfig()` for MiniMax API access
- Validate data with helpers in `src/utils/validation.ts`
- Extend types in `src/types/` rather than inline interfaces
- Export modules via barrel files (`index.ts`)
- All template tools must be JSON-serializable

## Key References

- **Project Plan**: `agent_advisor_mvp-plan.md` - Complete specification and timeline
- **Testing Notes**: `TESTING_NOTES.md` - Known issues and improvement plans
- **Getting Started**: `GETTING_STARTED.md` - User testing and usage guide
- **SDK Primers**: `Agent SDK Primers/` - TypeScript and Python reference docs
- **Examples**: `examples/usage-example.md` - Template usage patterns

## Implementation Status

✅ **Phase 1-5 Complete** - MVP Functional:
- Interview module (15 questions, 4 stages, state management, persistence)
- 5 agent templates with complete tool definitions
- Classification module with scoring engine
- Documentation module (planning brief generator)
- Main advisor agent with streaming MCP architecture
- Interactive CLI with session management

✅ **Recent Updates**:
- **Documentation Generator Test Coverage** (2025-11-02):
  - Added comprehensive test suite for `PlanningDocumentGenerator` class (78 unit tests)
  - Added test coverage for `generate_planning_document` MCP tool handler (45 unit tests)
  - Added E2E workflow tests covering full Requirements → Classification → Documentation pipeline (61 tests)
  - **Test Coverage Areas**:
    - All 5 templates validated (Data Analyst, Content Creator, Code Assistant, Research Agent, Automation Agent)
    - Verification of all 8 required sections (Overview, Requirements, Architecture, Phases, Security, Metrics, Risk, Deployment)
    - Heading hierarchy validation (H1 title, H2 sections)
    - Code block absence verification (ensures documentation-only output)
    - Section ordering and content substantiveness checks
    - Edge cases: empty implementation steps, no MCP servers, minimal requirements, complex capabilities
    - Error handling and Markdown formatting validation
    - Integration validation between classifier and generator
  - **Files Created**:
    - `tests/unit/documentation/document-generator.test.ts`
    - `tests/unit/documentation/planning-tool.test.ts`
    - `tests/e2e/document-generation.test.ts`
  - **Legacy Template Compatibility**: Added backward-compatible `AgentTemplate` exports to all 5 template files
  - **Test Results**: 184/184 tests passing (100%)
  - **Benefits**: Ensures planning documents are consistently structured, validates documentation-first workflow, prevents code generation drift
- **Documentation-First Workflow Transition** (2025-11-03):
  - Retired code/config generation and export tools in favor of a single planning deliverable.
  - Introduced `PlanningDocumentGenerator` and the `generate_planning_document` MCP tool.
  - Updated advisor system prompt, CLI fallback pipeline, and classification guidance to reference the documentation phase.
  - Streamlined module layout (`src/lib/documentation/`) and removed obsolete generation/export artifacts.
  - **Benefits**: Eliminates code scaffolding drift, keeps advisor focused on strategic planning, simplifies toolset to three core actions.
- **Console Screen Clearing Control** (2025-11-02):
  - Added `CLEAR_SCREEN` environment variable for controlling CLI startup behavior
  - Implemented `--no-clear` CLI flag for runtime override
  - Added `shouldClearScreen()` helper function (`src/cli.ts:11-29`)
  - Updated `AdvisorCLI` constructor to accept optional `clearScreen` parameter
  - TTY guard ensures clearing only occurs in interactive sessions
  - Flag precedence: `--no-clear` > `CLEAR_SCREEN` env variable > default (true)
  - Accepts flexible values: true/false, 1/0, yes/no (case-insensitive)
  - Updated `.env.example` with comprehensive documentation and examples
  - **Benefits**: Users can preserve terminal history when needed, safe TTY-only behavior
- **TodoWrite Prohibition Enhancement** (2025-11-02):
  - Added TodoWrite, TodoRead, TodoUpdate to PROHIBITED TOOLS in system prompt
  - New "Task Management and Workflow" subsection in Best Practices
  - Enhanced "Provide Complete Solutions" guideline to forbid TodoWrite
  - Added guidance to clear todos when tasks fail or cannot be executed
  - Documentation updates in CLAUDE.md and agents.md
  - **Rationale**: Task management tools are incompatible with Markdown-only output philosophy and create false expectations that the advisor will execute tasks rather than provide documentation
  - **Benefits**: Clearer advisor behavior, prevents confusion, reinforces documentation-first approach
- **Comprehensive Tool Documentation** (2025-11-02):
  - **System Prompt Corrections** (`src/advisor-agent.ts`):
    - Fixed `ask_interview_question` tool: Actions (`start`, `answer`, `skip`, `resume`, `status`), removed invalid actions (`ask`, `complete`)
    - Fixed `classify_agent_type` tool: Added `includeAlternatives` parameter, clarified JSON return format
    - Updated parameter descriptions to match actual tool handler implementations
  - **New Tool Reference Quick Guide** (CLAUDE.md, agents.md):
    - Comprehensive reference section for the three supported tools (interview, classification, documentation)
    - Detailed parameter descriptions with types and requirements
    - Return format specifications with structure details
    - Implementation file paths for easy code navigation
    - Clear distinction between JSON (interview/classification) and Markdown (documentation) outputs
  - **Enhanced Available Tools Summary Table** (agents.md):
    - Updated input column with complete parameter lists
    - Clarified output format with structure details for JSON tools
    - More descriptive and accurate tool specifications
  - **Benefits**:
    - Prevents tool hallucination through accurate documentation
    - Improves developer onboarding with centralized tool reference
    - Ensures advisor agent and developers use correct parameters
    - Provides quick lookup for tool usage patterns
- **Thinking Block Truncation Enhancement** (2025-11-02):
  - Implemented smart truncation algorithm with 2:1 split (first 67%, last 33%)
  - Configurable via `MAX_MESSAGE_LENGTH` env variable (default 300, range 50-1000)
  - Centralized helper functions: `getMaxMessageLength()` and `truncateMessage()`
  - Applied to all three thinking block streaming sites in advisor-agent.ts
  - Updated .env.example with comprehensive documentation and examples
- **Test Suite Improvements** (2025-11-02):
  - **Export Test Refactoring**: Eliminated redundant retry loops, DRY violations, and fixed sleeps
    - Removed outer retry loops in `afterEach` cleanup (test helpers already have retry logic)
    - Centralized file-existence checks using shared `waitForFileExists()` helper
    - Replaced fixed `setTimeout()` waits with condition-based polling (sentinel files)
    - Added try/finally blocks for robust spy restoration in mock tests
    - Documented vitest parallelism config rationale (`vitest.config.ts:16-22,45-47`)
  - **Previous Updates** (2025-11-01):
    - Added `QUESTIONS` export alias for backward compatibility (`src/lib/interview/questions.ts:177`)
    - Fixed validator test assertions to use `result.errors` array pattern
    - Updated test assertions to match actual error messages from validators
    - Added `getRequirements()` and `getProgress()` methods to `InterviewStateManager`
  - **Test pass rate**: 105/112 unit tests passing (94%), all export tests passing (20/20)
- **Session Management & Conversation Context**:
  - `runAdvisor()` now tracks and returns session IDs for conversation continuity
  - `ConversationMetadata` type tracks advisor session ID, message count, and timestamps
  - CLI automatically resumes most recent session on startup
  - `/load` command enhanced to restore full conversation context
  - Backward compatible with legacy sessions (optional metadata fields)
- **Markdown-Only Output**: Planning deliverables ship as Markdown only; no automated code or config generation remains.
- **Interactive Save Workflow** (2025-11-02):
  - Replaced command-line argument `/save <filename>` with fully interactive `/save` workflow
  - Added directory selection menu with create/custom path options
  - Implemented directory listing with filtering (excludes hidden, node_modules, dist, build, .git, sessions)
  - Added directory name sanitization (spaces to hyphens, invalid char removal, length clamping)
  - Timestamped default filenames (e.g., `advisor-output-2025-11-02.md`)
  - Path safety validation preserved from legacy implementation
  - Interactive prompts for all user inputs using `pendingConfirmation` pattern
  - **Helper Methods**: `listDirectories()`, `createNewDirectory()`, `selectDirectory()`, `prompt()`, `saveWithDirectorySelection()`
  - **Benefits**: Better UX, organized output structure, prevents accidental overwrites, safer path handling
- **CLI Output Capture**: Automatic capture with `/save` command (interactive) for easy persistence
- **No File Operations**: Advisor never writes files directly, only outputs Markdown
- **Enhanced UX**: Code fence detection with helpful copy tips

✅ **Test Suite Status**:
- **Documentation module**: 184/184 tests passing (100%)
  - Unit tests for `PlanningDocumentGenerator`: 78/78 passing
  - Unit tests for planning tool handler: 45/45 passing
  - E2E documentation workflow tests: 61/61 passing
- **Other modules**: See TESTING_NOTES.md for any remaining issues in interview/classification modules
- **Legacy export suite**: Retired in favor of documentation-first workflow

## Development Philosophy

1. **Template-First**: Start with working templates, customize rather than generate from scratch
2. **SDK-Native**: Leverage Claude Agent SDK patterns fully
3. **Type-Safe**: Zod validation for all inputs/outputs
4. **Streaming-First**: Real-time console output for better UX
5. **Markdown-Only**: No direct file operations; all outputs as formatted Markdown documents
6. **User Control**: Users decide when/where to persist generated code via `/save` command
7. **MVP Discipline**: Stick to 5 templates until roadmap specifies expansion
