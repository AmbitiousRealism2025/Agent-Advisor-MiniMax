# Agent Advisor MVP - MiniMax Edition

**Project Status**: Phase 5 Complete — MVP Ready with Comprehensive Testing
**Purpose**: Build an AI agent that guides developers through creating custom Claude agents using the Claude Agent SDK + MiniMax API

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
- Week 1: Core implementation (interview, templates, generation)
- Week 2: Polish, testing, deployment

---

## 📋 Quick Reference

### Key Files to Create
- `src/advisor-agent.ts` - Main advisor agent
- `src/templates/` - 5 agent templates
- `src/lib/` - Interview, classification, generation logic
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
3. Generates complete, working agent implementations
4. Exports code, configs, and implementation guides

**Success Criteria**: From concept to working agent in <10 minutes

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

Run the standard Node.js installation command after cloning the repository:

```bash
npm install
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
│   │   ├── generation/
│   │   └── export/
│   ├── types/
│   └── utils/
├── tests/
└── examples/
```

## Agent Templates

Five production-ready agent templates are now available:

### 1. **Data Analyst Agent** (`data-analyst`)
Specializes in CSV data processing, statistical analysis, and report generation.

**Tools:**
- `read_csv` - Parse CSV files with configurable options
- `analyze_data` - Perform descriptive, correlation, and regression analysis
- `generate_visualization` - Create charts (bar, line, scatter, pie, histogram, heatmap)
- `export_report` - Generate reports in PDF, HTML, Markdown, or JSON formats

**Ideal for:** Automated data analysis, business intelligence, data quality assessment

### 2. **Content Creator Agent** (`content-creator`)
Specializes in blog posts, documentation, marketing copy, and SEO optimization.

**Tools:**
- `generate_outline` - Create structured content outlines
- `write_section` - Write content sections with specified tone and style
- `optimize_for_seo` - Optimize content for search engines
- `format_content` - Format for various platforms (WordPress, Medium, GitHub, LinkedIn)

**Ideal for:** Content marketing, technical writing, automated content generation

### 3. **Code Assistant Agent** (`code-assistant`)
Specializes in code review, debugging, refactoring, and test generation.

**Tools:**
- `analyze_code` - Analyze for quality, security, performance, and complexity
- `suggest_improvements` - Provide actionable code improvement suggestions
- `generate_tests` - Generate unit tests with edge cases and mocks
- `refactor_code` - Refactor while maintaining functionality

**Ideal for:** Code quality improvement, technical debt reduction, developer productivity

### 4. **Research Agent** (`research-agent`)
Specializes in web search, content extraction, fact-checking, and source verification.

**Tools:**
- `web_search` - Search the web with advanced filtering
- `scrape_content` - Extract and parse web page content
- `extract_facts` - Extract key facts, statistics, and data points
- `verify_sources` - Verify source credibility and accuracy

**Ideal for:** Market research, competitive analysis, fact-checking, information gathering

### 5. **Automation Agent** (`automation-agent`)
Specializes in task orchestration, workflow automation, and scheduled execution.

**Tools:**
- `schedule_task` - Schedule tasks with cron-like syntax
- `execute_workflow` - Execute multi-step workflows with conditional logic
- `monitor_status` - Monitor task and workflow execution status
- `manage_queue` - Manage task queues with priority and rate limiting

**Ideal for:** Process automation, batch processing, DevOps automation, system integration

## Template Usage

```typescript
import {
  ALL_TEMPLATES,
  getTemplateById,
  getTemplatesByCapability,
  dataAnalystTemplate,
} from './src/templates';

// Access all templates
console.log(`${ALL_TEMPLATES.length} templates available`);

// Get template by ID
const template = getTemplateById('data-analyst');
console.log(template.name); // "Data Analyst Agent"
console.log(template.defaultTools.length); // 4 tools

// Find templates by capability
const dataTemplates = getTemplatesByCapability('data-processing');
```

## Development

- `npm run dev` — Launch the advisor agent in watch mode with `tsx`.
- `npm run build` — Compile TypeScript output into the `dist/` directory.
- `npm run test` — Execute the Vitest suite.
- `npm start` — Run the compiled advisor agent from `dist/`.
- `npm run cli` — Start the interactive CLI.
- `npm run cli:interactive` — Start the interactive CLI (explicit).
- `npm run advisor` — Run the advisor agent directly.

## Usage Examples

For comprehensive usage examples including all five templates, CLI commands, programmatic usage, customization guide, and best practices, see:

**[examples/usage-example.md](examples/usage-example.md)**

This guide includes:
- Template-specific examples for each of the 5 agent types
- Complete CLI commands reference
- Programmatic usage with the Pipeline API
- Customization guide for extending generated agents
- Best practices for deployment and production use

## Testing

The Agent Advisor MVP has comprehensive test coverage (90%+ on core logic) to ensure reliability and quality.

### Test Coverage

- **Unit Tests**: Individual module testing (interview, classification, generation)
- **Integration Tests**: Module interaction testing (interview flow, pipeline)
- **End-to-End Tests**: Complete workflow testing for all 5 templates
- **Validation Tests**: TypeScript compilation verification for generated code

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
│   └── test-helpers.ts    # Factory functions and validators
├── unit/                  # Unit tests
│   ├── interview/         # Interview module tests
│   ├── classification/    # Classifier tests
│   ├── generation/        # Code/prompt/config generator tests
│   └── export/            # File writer and packager tests
├── integration/           # Integration tests
│   ├── interview-flow.test.ts  # Complete interview flow
│   └── pipeline.test.ts        # Full pipeline integration
├── validation/            # Validation tests
│   └── typescript-compilation.test.ts  # Code compilation checks
└── e2e/                   # End-to-end tests
    ├── all-templates.test.ts        # All 5 templates
    └── template-data-analyst.test.ts # Template-specific tests
```

### Coverage Report

After running `npm run test:coverage`, view the coverage report in the `coverage/` directory:

```bash
# View HTML coverage report
open coverage/index.html
```

### Quality Assurance

- **Code Quality**: All generated code passes TypeScript strict mode compilation
- **Template Coverage**: All 5 templates tested end-to-end with sample requirements
- **Error Handling**: Comprehensive error handling tested with invalid inputs
- **File Operations**: File I/O operations tested with temporary directories
- **90%+ Coverage**: Core logic (interview, classification, generation) exceeds 90% coverage

## Implementation Status

All phases complete — **Production Ready**:
- ✅ **Phase 1**: Interview module with 15 questions, state management, validation, and persistence
- ✅ **Phase 2**: Five production-ready agent templates with complete tool definitions
- ✅ **Phase 3**: Classification module with template scoring and recommendations
- ✅ **Phase 4**: Generation module for code, prompts, and configuration files
- ✅ **Phase 5**: Export subsystem, main advisor agent, CLI, and pipeline orchestration
- ✅ **Phase 6**: Comprehensive testing suite with 90%+ coverage
