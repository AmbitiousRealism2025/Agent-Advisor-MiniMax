# Getting Started with Agent Advisor MVP

A step-by-step guide to test and explore the Agent Advisor system.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A MiniMax API JWT token (for production use)

## Quick Start

### 1. Installation

```bash
# Clone the repository (if not already done)
cd agent_advisor-minimax-mvp

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Environment Setup

```bash
# The .env file should already exist, but might be empty
# Open it and add your MiniMax JWT token
nano .env
# or use your favorite editor
code .env
```

**Add the following to your `.env` file:**
```bash
MINIMAX_JWT_TOKEN=your_actual_jwt_token_here
LOG_LEVEL=info
NODE_ENV=development
```

**Verify your setup:**
```bash
node check-env.js
```

This will check if your environment variables are loaded correctly.

**Note:** The MiniMax JWT token is REQUIRED to run the CLI. It should be in JWT format (three parts separated by dots like: `header.payload.signature`).

## Testing the System

### Option 1: Interactive CLI (Recommended)

Start the interactive command-line interface:

```bash
npm run cli
```

**Available Commands:**
- `/help` - Show available commands
- `/templates` - List all 5 agent templates
- `/status` - Show current interview session status
- `/history` - View conversation history
- `/save` - Save current interview session
- `/load` - Load a previous session
- `/clear` - Clear the screen
- `/exit` - Exit the CLI

**Example Session:**
```
> What agent templates are available?
[Lists 5 templates: Data Analyst, Content Creator, Code Assistant, Research Agent, Automation Agent]

> I want to build a data analysis agent
[Advisor starts interview process and guides you through questions]
```

### Option 2: Direct Query Mode

Run a single query without entering interactive mode:

```bash
npm run cli "I want to build an agent that analyzes CSV files"
```

### Option 3: Run Individual Modules

#### Test the Interview Module

```typescript
// Create a test file: test-interview.ts
import { InterviewStateManager } from './src/lib/interview';

const manager = new InterviewStateManager();
manager.initializeSession();

// Get first question
const question = manager.getCurrentQuestion();
console.log(question.question);

// Record response
manager.recordResponse(question.id, 'Sales Data Analyzer');

// Move to next question
const nextQuestion = manager.getCurrentQuestion();
console.log(nextQuestion.question);
```

Run it:
```bash
npx tsx test-interview.ts
```

#### Test the Classification Module

```typescript
// Create a test file: test-classify.ts
import { AgentClassifier } from './src/lib/classification';
import { sampleDataAnalystRequirements } from './tests/fixtures/sample-requirements';

const classifier = new AgentClassifier();
const recommendations = classifier.classify(sampleDataAnalystRequirements);

console.log('Template:', recommendations.agentType);
console.log('Complexity:', recommendations.estimatedComplexity);
console.log('Tools:', recommendations.toolConfigurations.length);
console.log('MCP Servers:', recommendations.mcpServers);
```

Run it:
```bash
npx tsx test-classify.ts
```

#### Test the Generation Module

```typescript
// Create a test file: test-generate.ts
import { CodeGenerator, PromptGenerator, ConfigGenerator } from './src/lib/generation';
import { sampleDataAnalystRequirements } from './tests/fixtures/sample-requirements';
import { AgentClassifier } from './src/lib/classification';

const classifier = new AgentClassifier();
const recommendations = classifier.classify(sampleDataAnalystRequirements);

// Generate code
const codeGen = new CodeGenerator();
const code = codeGen.generateFullCode({
  templateId: 'data-analyst',
  agentName: 'TestAgent',
  includeComments: true
});
console.log('Generated code length:', code.length);

// Generate system prompt
const promptGen = new PromptGenerator();
const prompt = promptGen.generate({
  templateId: 'data-analyst',
  requirements: sampleDataAnalystRequirements,
  verbosityLevel: 'detailed'
});
console.log('Generated prompt preview:', prompt.substring(0, 200));

// Generate package.json
const configGen = new ConfigGenerator();
const packageJson = configGen.generatePackageJSON({
  templateId: 'data-analyst',
  agentName: 'TestAgent',
  requirements: sampleDataAnalystRequirements
});
console.log('Package.json:', JSON.parse(packageJson).name);
```

Run it:
```bash
npx tsx test-generate.ts
```

#### Test the Packaging Module

```typescript
// Create a test file: test-package.ts
import { AgentPackager } from './src/lib/export';
import { AgentClassifier } from './src/lib/classification';
import { sampleDataAnalystRequirements } from './tests/fixtures/sample-requirements';

const classifier = new AgentClassifier();
const recommendations = classifier.classify(sampleDataAnalystRequirements);

const packager = new AgentPackager();
const result = await packager.packageAgent({
  outputDir: './output/test-agent',
  agentName: 'Test Data Analyst',
  templateId: 'data-analyst',
  requirements: sampleDataAnalystRequirements,
  recommendations,
  includeDocumentation: true,
  includeExamples: true,
  includeTests: true
});

console.log('Success:', result.success);
console.log('Files created:', result.files.length);
console.log('Output directory:', result.outputDir);
console.log('Manifest:', result.manifest);
```

Run it:
```bash
npx tsx test-package.ts
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage report
npm run test:coverage

# Watch mode (runs tests on file changes)
npm run test:watch

# Interactive UI
npm run test:ui
```

### Run Specific Test Files

```bash
# FileWriter tests
npm test tests/unit/export/file-writer.test.ts

# AgentPackager tests
npm test tests/unit/export/packager.test.ts

# Classification tests
npm test tests/unit/classification/classifier.test.ts

# Code generation tests
npm test tests/unit/generation/code-generator.test.ts
```

## Exploring the Templates

### View All Templates

```typescript
import { ALL_TEMPLATES, getTemplateById, getTemplatesByCapability } from './src/templates';

// List all templates
console.log(`Available templates: ${ALL_TEMPLATES.length}`);
ALL_TEMPLATES.forEach(t => {
  console.log(`- ${t.name} (${t.id})`);
  console.log(`  ${t.description}`);
  console.log(`  Tools: ${t.defaultTools.length}`);
  console.log(`  Capabilities: ${t.capabilityTags.join(', ')}`);
});

// Get specific template
const dataAnalyst = getTemplateById('data-analyst');
console.log('\nData Analyst Tools:');
dataAnalyst?.defaultTools.forEach(tool => {
  console.log(`- ${tool.name}: ${tool.description}`);
});

// Find templates by capability
const fileAccessTemplates = getTemplatesByCapability('file-access');
console.log(`\nTemplates with file access: ${fileAccessTemplates.length}`);
```

### Test Template Matching

Use the sample requirements fixtures to test classification:

```typescript
import { AgentClassifier } from './src/lib/classification';
import {
  sampleDataAnalystRequirements,
  sampleContentCreatorRequirements,
  sampleCodeAssistantRequirements,
  sampleResearchAgentRequirements,
  sampleAutomationAgentRequirements,
  allSampleRequirements,
  expectedTemplateIds
} from './tests/fixtures/sample-requirements';

const classifier = new AgentClassifier();

allSampleRequirements.forEach((req, index) => {
  const recommendations = classifier.classify(req);
  console.log(`\n${req.name}:`);
  console.log(`  Expected: ${expectedTemplateIds[index]}`);
  console.log(`  Matched: ${recommendations.agentType}`);
  console.log(`  Complexity: ${recommendations.estimatedComplexity}`);
  console.log(`  Confidence: ${recommendations.confidenceScore || 'N/A'}`);
});
```

## Complete Workflow Example

Here's a complete example of the entire pipeline:

```typescript
import { InterviewStateManager } from './src/lib/interview';
import { AgentClassifier } from './src/lib/classification';
import { AgentPackager } from './src/lib/export';
import { QUESTIONS } from './src/lib/interview/questions';

async function completeWorkflow() {
  // 1. Interview Phase
  console.log('Phase 1: Interview');
  const manager = new InterviewStateManager();
  manager.initializeSession();

  // Simulate answering all questions
  const responses = [
    'Sales Data Analyzer',
    'Analyzes sales data and generates insights',
    'Generate weekly sales reports with trend analysis',
    ['Sales managers', 'Marketing analysts'],
    'task-focused',
    ['CLI', 'API'],
    ['Report accuracy', 'Processing speed'],
    'short-term',
    'yes', // fileAccess
    'no',  // webAccess
    'no',  // codeExecution
    'yes', // dataAnalysis
    '',    // toolIntegrations (empty)
    'local',
    ''     // additionalRequirements (empty)
  ];

  QUESTIONS.forEach((q, i) => {
    manager.recordResponse(q.id, responses[i]);
  });

  const requirements = manager.getState().requirements;
  console.log('Requirements collected:', requirements.name);

  // 2. Classification Phase
  console.log('\nPhase 2: Classification');
  const classifier = new AgentClassifier();
  const recommendations = classifier.classify(requirements);
  console.log('Template matched:', recommendations.agentType);
  console.log('Complexity:', recommendations.estimatedComplexity);
  console.log('Tools required:', recommendations.toolConfigurations.length);

  // 3. Generation & Packaging Phase
  console.log('\nPhase 3: Generation & Packaging');
  const packager = new AgentPackager();
  const result = await packager.packageAgent({
    outputDir: './output/sales-analyzer',
    agentName: requirements.name,
    templateId: recommendations.agentType,
    requirements,
    recommendations,
    includeDocumentation: true,
    includeExamples: true,
    includeTests: true
  });

  console.log('Packaging successful:', result.success);
  console.log('Files created:', result.files.filter(f => f.success).length);
  console.log('Output location:', result.outputDir);
  console.log('\nGenerated project structure:');
  result.manifest.files.forEach(file => console.log(`  ${file}`));
}

completeWorkflow().catch(console.error);
```

Run it:
```bash
npx tsx complete-workflow.ts
```

## Development Mode

For active development with auto-reload:

```bash
npm run dev
```

This starts the advisor agent with watch mode - any changes to source files will automatically trigger a rebuild.

## Troubleshooting

### Issue: "Environment variable MINIMAX_JWT_TOKEN is required"
**This is the most common issue!**

**Diagnosis:**
```bash
node check-env.js
```

**Solution:**
1. Open your `.env` file (it might be empty):
   ```bash
   nano .env
   ```

2. Add your MiniMax JWT token:
   ```bash
   MINIMAX_JWT_TOKEN=eyJhbGci...your.actual.token
   LOG_LEVEL=info
   NODE_ENV=development
   ```

3. Save the file and verify:
   ```bash
   node check-env.js
   ```

4. Try running the CLI again:
   ```bash
   npm run cli
   ```

**Quick test without `.env` file:**
```bash
MINIMAX_JWT_TOKEN="your_token_here" npm run cli
```

See `setup-env.md` for detailed troubleshooting.

### Issue: "must be a valid JWT formatted token"
**Solution:** Your token should have three parts separated by dots:
- Format: `header.payload.signature`
- Example: `eyJhbGci...eyJzdWIi...SflKxwRJ`
- Check your MiniMax account for the correct token format

### Issue: "Cannot find module" errors
**Solution:** Make sure you've run `npm install` and `npm run build`

### Issue: Tests failing with ENOENT errors
**Solution:** Clean up test temporary directories:
```bash
rm -rf test-temp sessions
npm test
```

### Issue: TypeScript compilation errors in tests
**Solution:** The project has some pre-existing TypeScript issues in older test files. These don't affect the core functionality. Focus on:
- `tests/unit/export/file-writer.test.ts` (17 tests, all passing)
- `tests/unit/export/packager.test.ts` (3 tests, all passing)
- `tests/unit/generation/*.test.ts` (all passing)
- `tests/unit/classification/classifier.test.ts` (most passing)

### Issue: MiniMax API errors
**Solution:** The interview, classification, and generation modules work independently of MiniMax. You only need the API token for the full advisor agent with streaming responses.

## Next Steps

1. **Test the Interactive CLI:**
   ```bash
   npm run cli
   ```
   Try commands like `/templates`, then ask questions about what agent you want to build.

2. **Run the Test Suite:**
   ```bash
   npm run test:unit
   ```
   Pay special attention to the export module tests (FileWriter and AgentPackager).

3. **Generate a Sample Agent:**
   Create a test script using the complete workflow example above and generate a real agent project.

4. **Explore Generated Output:**
   Check the `output/` directory for generated agent projects and review the structure, code quality, and documentation.

5. **Customize Templates:**
   Review the templates in `src/templates/` to understand the tool definitions and system prompts.

## Project Structure Reference

```
agent_advisor-minimax-mvp/
├── src/
│   ├── templates/           # 5 agent templates with tools
│   ├── lib/
│   │   ├── interview/       # Question flow and state management
│   │   ├── classification/  # Template matching engine
│   │   ├── generation/      # Code, prompt, config generators
│   │   └── export/          # File writing and packaging
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Config and validation helpers
│   ├── advisor-agent.ts     # Main MCP server and advisor
│   └── cli.ts               # Interactive CLI interface
├── tests/
│   ├── unit/                # Unit tests for all modules
│   ├── integration/         # Integration tests
│   ├── e2e/                 # End-to-end tests
│   ├── fixtures/            # Test data (sample requirements)
│   └── utils/               # Test helpers and utilities
├── output/                  # Generated agent projects (gitignored)
├── sessions/                # Interview sessions (gitignored)
└── examples/                # Example usage and demos
```

## Additional Resources

- **Project Plan:** See `agent_advisor_mvp-plan.md` for architecture details
- **Agent Onboarding:** See `CLAUDE.md` for comprehensive project overview
- **SDK Documentation:** Check `Agent SDK Primers/` for MiniMax integration patterns
- **Template Specs:** Review `src/templates/` for tool definitions and capabilities

## Getting Help

If you encounter issues:

1. Check the test output for specific error messages
2. Review the CLAUDE.md file for implementation status
3. Look at the test fixtures in `tests/fixtures/sample-requirements.ts` for examples
4. Check the generated output in `output/` directories for debugging

Happy testing! 🚀
