# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission Overview

Build an advisor agent that interviews developers, classifies their needs, and generates Claude Agent SDK projects targeting the MiniMax API. All generated code must work with Node.js 18+, the MiniMax-M2 model, and the Claude Agent SDK.

## Essential Commands

### Development Workflow
```bash
npm install           # Install dependencies
npm run build         # Compile TypeScript (dist/)
npm run dev           # Watch-mode development (tsx)
npm start             # Run compiled advisor from dist/
npm run cli           # Interactive CLI (recommended)
npm run advisor       # Direct advisor agent execution
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
npx vitest watch tests/unit/generation/code-generator.test.ts
```

## Architecture Overview

### Core System: Agent-Built Agent Builder

The advisor itself is built using the Claude Agent SDK and creates a **streaming conversational workflow**:

1. **Interview Phase** → `ask_interview_question` tool
2. **Classification Phase** → `classify_agent_type` tool
3. **Generation Phase** → 3 tools (`generate_agent_code`, `generate_system_prompt`, `generate_config_files`)
4. **Export Phase** → `generate_implementation_guide` tool

### MCP Integration

The advisor uses **MCP (Model Context Protocol)** via `createSdkMcpServer()` to register all tools. This enables:
- Streaming responses with real-time console output
- Tool call orchestration through the MiniMax API
- **Markdown-formatted tool results** with code blocks and copy instructions
- Zod validation for all tool inputs

### Output Format: Markdown-Only

**CRITICAL**: The advisor **NEVER** writes files directly. All outputs are formatted as Markdown documents:

- **Tool Results**: All generation tools return Markdown with code fences, file headers, and copy instructions
- **No File Operations**: System prompt explicitly forbids Bash, Write, Edit, or any file operations
- **User Workflow**: Users receive Markdown output → use `/save <filename>` command → copy code from saved file
- **Benefits**: Safe, reviewable, portable output that users control when/where to persist

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
- `thinking` - Extended reasoning blocks (MiniMax-M2)
- `error` - Error handling

**Module Organization**:
- `src/lib/interview/` - Interactive interview state machine with session management
- `src/lib/classification/` - Template matching and scoring engine
- `src/lib/generation/` - Code/prompt/config generators (return Markdown)
- `src/lib/export/` - Implementation guide generator (returns Markdown)
- `src/templates/` - 5 agent templates with tool definitions

## Interactive CLI Commands

When running `npm run cli`, the following commands are available:

```
/help              - Show available commands
/exit, /quit       - Exit the CLI
/clear             - Clear console screen
/history           - Show conversation history
/save <filename>   - Save last advisor output to Markdown file
/load [name]       - Load saved interview session
/status            - Show current interview progress
/templates         - List all available agent templates
```

**Query Mode**: Any input that doesn't start with `/` is treated as a query and streamed to the advisor agent.

**Output Capture**: The CLI automatically captures all advisor responses. When code blocks are detected:
- Visual separator and tip message appears
- Use `/save my-agent.md` to write output to disk
- File saved with full Markdown formatting for easy copy-paste

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
```

### MiniMax Configuration Pattern
```typescript
import { getMinimaxConfig } from './src/utils/minimax-config.js';

const config = getMinimaxConfig();
// Returns: { baseUrl: 'https://api.minimax.io/anthropic', apiKey: process.env.MINIMAX_JWT_TOKEN }
```

## Project Structure

```
src/
├── advisor-agent.ts      # Main advisor with MCP server setup
├── cli.ts                # Interactive CLI with session management
├── templates/            # 5 agent templates (data-analyst, content-creator, etc.)
│   ├── index.ts          # Template registry with lookup functions
│   └── template-types.ts # Shared types and convertToolSchemaToConfig()
├── lib/
│   ├── interview/        # State machine, questions, validation, persistence
│   ├── classification/   # AgentClassifier with scoring algorithm
│   ├── generation/       # Code/prompt/config generators
│   └── export/           # FileWriter and AgentPackager
├── types/                # Shared TypeScript interfaces
└── utils/                # minimax-config.ts, validation.ts

tests/
├── fixtures/             # Sample requirements and responses
├── utils/                # Test helpers and factory functions
├── unit/                 # Module-level tests
├── integration/          # Multi-module workflow tests
├── validation/           # TypeScript compilation checks
└── e2e/                  # Complete workflow tests for all templates

sessions/                 # Interview session persistence (gitignored)
output/                   # Generated agent projects (gitignored)
examples/                 # Reference implementations
```

## Five Agent Templates

1. **Data Analyst** (`data-analyst`) - CSV processing, statistics, visualization, reporting
2. **Content Creator** (`content-creator`) - Blog posts, SEO optimization, multi-platform formatting
3. **Code Assistant** (`code-assistant`) - Code review, refactoring, test generation, debugging
4. **Research Agent** (`research-agent`) - Web search, content extraction, fact-checking, source verification
5. **Automation Agent** (`automation-agent`) - Task scheduling, workflow orchestration, queue management

Access via:
```typescript
import { ALL_TEMPLATES, getTemplateById, getTemplatesByCapability } from './src/templates';
```

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
- **All tool handlers return Markdown**: Generation and export tools format responses as Markdown documents
- **Code Fences**: Use proper language tags (typescript, json, markdown, bash, env)
- **File Headers**: Each code block prefixed with `### File: \`filename\``
- **Copy Instructions**: Each code block followed by `**To use**: Copy the above code to...`
- **Error Format**: Errors also returned as Markdown with `## Error` heading and troubleshooting sections

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

## Troubleshooting

### Build Errors
```bash
# Clean build
rm -rf dist/
npm run build

# Check TypeScript errors without emitting
npx tsc --noEmit
```

### Test Failures
See `TESTING_NOTES.md` for known issues and priority fixes. Current status:
- **92/112 tests passing** (improved from 74/112)
- Recent fixes: QUESTIONS export alias, validation type corrections, error message matching
- Remaining issues: Interview validation edge cases, file system race conditions

### MiniMax Connection Issues
```bash
# Verify JWT token is set
echo $MINIMAX_JWT_TOKEN

# Test with simple query
npm run cli
> "Hello, can you help me build an agent?"
```

### Generated Code Won't Compile
- Check that generated code uses `.js` imports
- Verify all Zod schemas are properly defined
- Run `npx tsc` in generated project directory
- See `examples/` for working reference implementations

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
- Generation module (code, prompts, config files)
- Main advisor agent with streaming MCP architecture
- Interactive CLI with session management

✅ **Recent Updates**:
- **Test Suite Improvements** (Latest - 2025-11-02):
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
- **Markdown-Only Output**: All generation tools now return formatted Markdown instead of JSON
- **CLI Output Capture**: Automatic capture with `/save <filename>` command for easy persistence
- **No File Operations**: Advisor never writes files directly, only outputs Markdown
- **Enhanced UX**: Code fence detection with helpful copy tips

🟡 **Known Issues** (see TESTING_NOTES.md):
- 7/112 test failures remaining (down from 20/112, originally 38/112)
- Remaining issues: Interview validator edge cases (2 tests), state-manager timestamp handling (5 tests)
- Export tests fully stabilized: All 20 file-writer and packager tests passing
- Pipeline tests use generator classes directly (not affected by tool handler changes)

## Development Philosophy

1. **Template-First**: Start with working templates, customize rather than generate from scratch
2. **SDK-Native**: Leverage Claude Agent SDK patterns fully
3. **Type-Safe**: Zod validation for all inputs/outputs
4. **Streaming-First**: Real-time console output for better UX
5. **Markdown-Only**: No direct file operations; all outputs as formatted Markdown documents
6. **User Control**: Users decide when/where to persist generated code via `/save` command
7. **MVP Discipline**: Stick to 5 templates until roadmap specifies expansion
