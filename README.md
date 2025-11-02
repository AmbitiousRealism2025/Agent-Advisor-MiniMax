# Agent Advisor MVP - MiniMax Edition

**Project Status**: ✅ Phase 5 Complete — MVP Functional & Deployed to GitHub
**Purpose**: AI-powered advisor that creates comprehensive planning documents for agent implementation
**Repository**: [github.com/AmbitiousRealism2025/Agent-Advisor-MiniMax](https://github.com/AmbitiousRealism2025/Agent-Advisor-MiniMax)

---

## 📋 Quick Links

- **Testing Notes**: See [TESTING_NOTES.md](./TESTING_NOTES.md) for known issues and planned improvements
- **Getting Started**: See [GETTING_STARTED.md](./GETTING_STARTED.md) for testing and usage guide
- **Developer Guide**: See [CLAUDE.md](./CLAUDE.md) for agent onboarding and project structure
- **Project Plan**: See [agent_advisor_mvp-plan.md](./agent_advisor_mvp-plan.md) for complete specification

---

## 🚀 Getting Started (For AI Agents)

If you are an AI agent tasked with building this project, follow these steps:

### Step 1: Review Foundation Documentation

**REQUIRED READING** before starting implementation:

1. **Project Plan**: `agent_advisor_mvp-plan.md`
   - Complete MVP specification
   - Technical architecture
   - Implementation timeline
   - Code examples and patterns

2. **Project Configuration**: `CLAUDE.md` (when created)
   - Project-specific instructions
   - Development guidelines
   - Claude Code configuration

3. **Claude Agent SDK Primers**: `Agent SDK Primers/` folder
   - `AGENT_SDK_PRIMER_TYPESCRIPT.md` - Complete TypeScript SDK reference (32KB)
   - `AGENT_SDK_PRIMER_PYTHON.md` - Complete Python SDK reference (18KB)
   - Essential patterns for building agents
   - MiniMax API integration patterns
   - Tool development best practices

### Step 2: Understand the Architecture

This project builds **an agent that builds agents** using:
- **Claude Agent SDK** - Official Anthropic SDK for autonomous agents
- **MiniMax API** - Anthropic-compatible API with JWT authentication
- **MiniMax-M2 Model** - Advanced reasoning with extended context
- **TypeScript** - Primary implementation language for MVP

### Step 3: Review Reference Implementation

Reference the validated patterns from:
- **minimax-agent-builder workspace** at `/Users/ambrealismwork/Desktop/Coding-Projects/minimax-agent-builder/`
- Working test implementations in TypeScript and Python
- Proven MiniMax configuration and authentication

### Step 4: Begin Implementation

Follow the development timeline in `agent_advisor_mvp-plan.md`:
- Week 1: Core implementation (interview, templates, documentation)
- Week 2: Polish, testing, deployment

---

## 📋 Quick Reference

### Key Files to Create
- `src/advisor-agent.ts` - Main advisor agent
- `src/templates/` - 5 agent templates
- `src/lib/` - Interview, classification, documentation logic
- `tests/` - Comprehensive test suite

### Core Dependencies
```json
{
  "@anthropic-ai/claude-agent-sdk": "^0.1.30",
  "zod": "^3.22.4"
}
```

### MiniMax Configuration
```typescript
const config = {
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN,
  model: 'MiniMax-M2'
};
```

---

## 🎯 Project Goal

Build a CLI tool that:
1. Conducts interactive interview to understand developer needs
2. Classifies requirements into appropriate agent types
3. Generates comprehensive planning documents for implementation
4. Provides structured guidance for handoff

**Success Criteria**: From concept to actionable implementation plan in <10 minutes

---

## 📚 Documentation Hierarchy

1. **READ FIRST**: `agent_advisor_mvp-plan.md` (this folder)
2. **READ SECOND**: `Agent SDK Primers/AGENT_SDK_PRIMER_TYPESCRIPT.md`
3. **REFERENCE**: `Agent SDK Primers/AGENT_SDK_PRIMER_PYTHON.md`
4. **VALIDATE**: Test implementations at `../minimax-agent-builder/`

---

## ⚡ Quick Start Command

```bash
npm install
npm run build
```

---

**Next Agent**: Please review the documentation listed above before beginning implementation. The MVP plan contains complete specifications, code examples, and a detailed timeline to follow.

---

## Installation

### Local Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/AmbitiousRealism2025/Agent-Advisor-MiniMax.git
cd agent_advisor-minimax-mvp
npm install
npm run build
```

### Global Installation

Install globally to use the `agent-advisor` command anywhere:

```bash
npm install -g agent-advisor-mvp
```

After global installation, you can run:
```bash
agent-advisor
```

### Using npx (No Installation Required)

Run directly without installing:

```bash
npx agent-advisor-mvp
```

### Local Package Usage

After installing locally in a project:

```bash
npm install agent-advisor-mvp
npx agent-advisor
```

## Project Structure

Key folders scaffolded during Phase 1:

```text
agent_advisor-minimax-mvp/
├── src/
│   ├── templates/
│   ├── lib/
│   │   ├── interview/
│   │   ├── classification/
│   │   ├── documentation/
│   │   └── export/         # (legacy utilities, not main workflow)
│   ├── types/
│   └── utils/
├── tests/
└── examples/
```

## Agent Templates

Five production-ready agent templates are now available:

### 1. **Data Analyst Agent** (`data-analyst`)
Specializes in CSV data processing, statistical analysis, and report generation.

**Implementation Guidance:**
- CSV parsing and validation architecture
- Statistical analysis module design
- Visualization pipeline configuration
- Report generation and export strategies

**Ideal for:** Automated data analysis, business intelligence, data quality assessment

### 2. **Content Creator Agent** (`content-creator`)
Specializes in blog posts, documentation, marketing copy, and SEO optimization.

**Implementation Guidance:**
- Content outline generation architecture
- Multi-tone writing module design
- SEO optimization pipeline
- Multi-platform formatting strategies

**Ideal for:** Content marketing, technical writing, automated content generation

### 3. **Code Assistant Agent** (`code-assistant`)
Specializes in code review, debugging, refactoring, and test generation.

**Implementation Guidance:**
- Static code analysis architecture
- Improvement suggestion engine design
- Test generation pipeline
- Refactoring workflow strategies

**Ideal for:** Code quality improvement, technical debt reduction, developer productivity

### 4. **Research Agent** (`research-agent`)
Specializes in web search, content extraction, fact-checking, and source verification.

**Implementation Guidance:**
- Web search integration architecture
- Content extraction and parsing strategies
- Fact extraction pipeline design
- Source verification and credibility assessment

**Ideal for:** Market research, competitive analysis, fact-checking, information gathering

### 5. **Automation Agent** (`automation-agent`)
Specializes in task orchestration, workflow automation, and scheduled execution.

**Implementation Guidance:**
- Task scheduling system architecture
- Multi-step workflow execution design
- Status monitoring pipeline
- Queue management and prioritization strategies

**Ideal for:** Process automation, batch processing, DevOps automation, system integration

## Template Usage

```typescript
import {
  ALL_DOCUMENT_TEMPLATES,
  getDocumentTemplateById,
  getDocumentTemplatesByCapability,
  dataAnalystDocumentTemplate,
} from './src/templates';

// Access all document templates
console.log(`${ALL_DOCUMENT_TEMPLATES.length} templates available`);

// Get template by ID
const template = getDocumentTemplateById('data-analyst');
console.log(template.name); // "Data Analyst Agent"
console.log(Object.keys(template.documentSections).length); // 8 sections

// Access implementation guidance
console.log(template.planningChecklist);
console.log(template.successCriteria);
console.log(template.documentSections.implementation);

// Find templates by capability
const dataTemplates = getDocumentTemplatesByCapability('data-processing');
```

## Development

- `npm run dev` — Launch the advisor agent in watch mode with `tsx`.
- `npm run build` — Compile TypeScript output into the `dist/` directory.
- `npm run test` — Execute the Vitest suite.
- `npm start` — Run the compiled advisor agent from `dist/`.
- `npm run cli` — Start the interactive CLI.
- `npm run cli -- --no-clear` — Start CLI without clearing screen (preserves terminal history).
- `npm run cli:interactive` — Start the interactive CLI (explicit).
- `npm run advisor` — Run the advisor agent directly.

## Environment Configuration

### Required Variables

```bash
MINIMAX_JWT_TOKEN=your_jwt_token_here  # Required for MiniMax API access
```

### Optional Variables

```bash
# Thinking block truncation length (default: 300, range: 50-1000)
MAX_MESSAGE_LENGTH=300

# CLI console clearing on startup (default: true, accepts: true/false/1/0/yes/no)
CLEAR_SCREEN=true

# Logging and environment
LOG_LEVEL=info                    # Logging level (default: info)
NODE_ENV=development              # Environment (default: development)
CLI_PATH=/path/to/claude          # Optional Claude CLI path
```

### Console Clearing Behavior

The CLI clears the console on startup by default for a clean interactive experience. You can control this behavior:

**Precedence order** (highest to lowest):
1. `--no-clear` CLI flag — Runtime override
2. `CLEAR_SCREEN` environment variable — Session preference
3. Default behavior — Clear screen (true)

**Examples:**
```bash
# Preserve terminal history with flag (highest precedence)
npm run cli -- --no-clear

# Disable via environment variable
CLEAR_SCREEN=false npm run cli

# Use default behavior (clear screen)
npm run cli
```

**Note**: Clearing only occurs in interactive TTY sessions; non-interactive mode is unaffected.

For complete environment variable documentation with examples, see `.env.example`.

## Usage Examples

For comprehensive usage examples including all five templates, CLI commands, programmatic usage, customization guide, and best practices, see:

**[examples/usage-example.md](examples/usage-example.md)**

This guide includes:
- Template-specific examples for each of the 5 agent types
- Complete CLI commands reference
- Programmatic usage with the Pipeline API
- Customization guide for adapting planning documents for implementation
- Best practices for deployment and production use

## Testing

The Agent Advisor MVP has comprehensive test coverage (90%+ on core logic) to ensure reliability and quality.

### Test Coverage

- **Unit Tests**: Individual module testing (interview, classification, documentation)
- **Integration Tests**: Module interaction testing (interview flow, pipeline)
- **End-to-End Tests**: Complete workflow testing for all 5 templates
- **Validation Tests**: Markdown structure validation for planning documents

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e           # End-to-end tests
npm run test:validation    # TypeScript validation tests

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with interactive UI
npm run test:ui
```

### Test Structure

```text
tests/
├── fixtures/              # Sample test data
│   ├── sample-requirements.ts  # Agent requirements for each template
│   └── sample-responses.ts     # Interview response sets
├── utils/                 # Test helpers
│   ├── test-helpers.ts    # Factory functions and validators
│   ├── markdown-validator.ts  # Markdown parsing and validation
│   └── e2e-helpers.ts     # E2E test wrappers
├── unit/                  # Unit tests
│   ├── interview/         # Interview module tests
│   ├── classification/    # Classifier tests
│   └── documentation/     # Planning document generator tests
├── integration/           # Integration tests
│   ├── interview-flow.test.ts  # Complete interview flow
│   └── pipeline.test.ts        # Full pipeline integration
├── validation/            # Validation tests
│   └── markdown-structure.test.ts  # Markdown structure validation
└── e2e/                   # End-to-end tests
    ├── document-generation.test.ts  # Documentation workflow E2E
    └── advisor-workflow.test.ts     # Complete advisor workflow
```

### Coverage Report

After running `npm run test:coverage`, view the coverage report in the `coverage/` directory:

```bash
# View HTML coverage report
open coverage/index.html
```

### Quality Assurance

- **Documentation Quality**: All planning documents validated for structure and completeness
- **Template Coverage**: All 5 templates tested end-to-end with sample requirements
- **Error Handling**: Comprehensive error handling tested with invalid inputs
- **Markdown Validation**: Planning document structure and formatting validated
- **90%+ Coverage**: Core logic (interview, classification, documentation) exceeds 90% coverage

## Implementation Status

All phases complete — **Production Ready**:
- ✅ **Phase 1**: Interview module with 15 questions, state management, validation, and persistence
- ✅ **Phase 2**: Five production-ready agent templates with comprehensive implementation guidance
- ✅ **Phase 3**: Classification module with template scoring and recommendations
- ✅ **Phase 4**: Documentation module for planning document generation
- ✅ **Phase 5**: Main advisor agent with 3-tool workflow, CLI, and session management
- ✅ **Phase 6**: Comprehensive testing suite with 90%+ coverage

### System Transformation (November 2025)

**Documentation-First Workflow**: The system has been transformed from code generation to planning document creation. Instead of generating code, the advisor now produces comprehensive Markdown planning documents with 8 standardized sections (Overview, Requirements, Architecture, Phases, Security, Metrics, Risk, Deployment). Users receive actionable implementation guidance that they execute offline, maintaining full control over the development process.
