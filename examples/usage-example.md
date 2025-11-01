# Agent Advisor Usage Examples

This guide provides comprehensive examples of using the Agent Advisor to create custom Claude Agent SDK projects integrated with MiniMax API.

## Table of Contents

1. [Template Examples](#template-examples)
2. [CLI Commands Reference](#cli-commands-reference)
3. [Programmatic Usage](#programmatic-usage)
4. [Customization Guide](#customization-guide)
5. [Best Practices](#best-practices)

---

## Template Examples

### Example 1: Data Analyst Agent

**Use Case:** Create an agent that analyzes CSV sales data and generates visual reports.

**Interview Responses:**
```
Agent Name: Sales Analytics Agent
Primary Use Case: Analyze quarterly sales data from CSV files
Target Users: Sales managers and business analysts
Main Actions: Read CSV files, perform statistical analysis, generate charts
Interaction Style: Professional reports with data insights
Expected Outcomes: Quarterly sales reports with trend analysis
Capabilities: Data processing, statistical analysis, visualization
Tools Needed: CSV reader, statistical analyzer, chart generator
Input Types: CSV files with sales transactions
Output Formats: PDF reports with charts and tables
Error Handling: Validate data formats, handle missing values
Deployment: Local execution on business analyst workstations
```

**Generated Configuration:**
- **Template:** Data Analyst Agent
- **Tools:** `read_csv`, `analyze_data`, `generate_visualization`, `export_report`
- **MCP Servers:** `filesystem`, `data-processing`
- **Dependencies:** `@anthropic-ai/claude-agent-sdk`, `csv-parser`, `d3`

**Expected Output:**
```typescript
// src/agent.ts
import { Agent } from '@anthropic-ai/claude-agent-sdk';

const agent = new Agent({
  model: 'minimax-m2',
  systemPrompt: `You are a Sales Analytics Agent specialized in...`,
});

// Tools configured for CSV analysis, statistics, and visualization
```

---

### Example 2: Content Creator Agent

**Use Case:** Generate blog posts optimized for SEO with consistent brand voice.

**Interview Responses:**
```
Agent Name: Brand Content Writer
Primary Use Case: Create SEO-optimized blog posts
Target Users: Marketing team members
Main Actions: Generate outlines, write sections, optimize for SEO
Interaction Style: Creative but professional writing
Expected Outcomes: Publication-ready blog posts
Capabilities: Content creation, SEO optimization, formatting
Tools Needed: Outline generator, content writer, SEO optimizer
Input Types: Topic keywords, target audience info
Output Formats: Markdown, WordPress-ready HTML
Error Handling: Check for plagiarism, validate SEO scores
Deployment: Cloud service for team access
```

**Generated Configuration:**
- **Template:** Content Creator Agent
- **Tools:** `generate_outline`, `write_section`, `optimize_for_seo`, `format_content`
- **MCP Servers:** `web-search`, `content-tools`
- **Dependencies:** `@anthropic-ai/claude-agent-sdk`, `markdown-it`, `seo-analyzer`

---

### Example 3: Code Assistant Agent

**Use Case:** Review pull requests and suggest improvements with automated refactoring.

**Interview Responses:**
```
Agent Name: PR Review Assistant
Primary Use Case: Automated code review and refactoring suggestions
Target Users: Software development team
Main Actions: Analyze code quality, suggest improvements, generate tests
Interaction Style: Technical and constructive feedback
Expected Outcomes: Detailed review comments with actionable suggestions
Capabilities: Code analysis, security scanning, test generation
Tools Needed: Code analyzer, improvement suggester, test generator
Input Types: Source code files (TypeScript, JavaScript, Python)
Output Formats: Markdown review reports, refactored code
Error Handling: Handle syntax errors, report security vulnerabilities
Deployment: CI/CD pipeline integration
```

**Generated Configuration:**
- **Template:** Code Assistant Agent
- **Tools:** `analyze_code`, `suggest_improvements`, `generate_tests`, `refactor_code`
- **MCP Servers:** `filesystem`, `code-analysis`, `testing`
- **Dependencies:** `@anthropic-ai/claude-agent-sdk`, `typescript`, `eslint`, `vitest`

---

### Example 4: Research Agent

**Use Case:** Conduct competitive analysis by gathering and verifying market data.

**Interview Responses:**
```
Agent Name: Market Research Agent
Primary Use Case: Competitive analysis and market research
Target Users: Product managers and strategists
Main Actions: Search web, extract data, verify sources, compile reports
Interaction Style: Analytical and fact-based
Expected Outcomes: Comprehensive research reports with verified sources
Capabilities: Web search, data extraction, fact-checking
Tools Needed: Web searcher, content scraper, fact verifier
Input Types: Company names, market segments
Output Formats: PDF reports, structured JSON data
Error Handling: Validate source credibility, handle rate limits
Deployment: On-demand cloud execution
```

**Generated Configuration:**
- **Template:** Research Agent
- **Tools:** `web_search`, `scrape_content`, `extract_facts`, `verify_sources`
- **MCP Servers:** `web-search`, `web-fetch`, `memory`
- **Dependencies:** `@anthropic-ai/claude-agent-sdk`, `cheerio`, `axios`

---

### Example 5: Automation Agent

**Use Case:** Schedule and orchestrate data pipeline tasks with monitoring.

**Interview Responses:**
```
Agent Name: Pipeline Orchestrator
Primary Use Case: Automated data pipeline scheduling
Target Users: Data engineers and DevOps team
Main Actions: Schedule tasks, execute workflows, monitor status
Interaction Style: System-level automation
Expected Outcomes: Reliable task execution with monitoring alerts
Capabilities: Task scheduling, workflow orchestration, monitoring
Tools Needed: Scheduler, workflow executor, status monitor
Input Types: Workflow definitions (YAML/JSON)
Output Formats: Execution logs, status dashboards
Error Handling: Retry failed tasks, send alerts on failures
Deployment: Server-based with 24/7 availability
```

**Generated Configuration:**
- **Template:** Automation Agent
- **Tools:** `schedule_task`, `execute_workflow`, `monitor_status`, `manage_queue`
- **MCP Servers:** `scheduler`, `monitoring`, `notifications`
- **Dependencies:** `@anthropic-ai/claude-agent-sdk`, `node-cron`, `bull`

---

## CLI Commands Reference

### Interactive Mode

Start the interactive CLI:
```bash
npm run cli:interactive
# or
npm run cli
```

Available commands in interactive mode:
```
/help              - Show help message
/exit, /quit       - Exit the CLI
/clear             - Clear the screen
/history           - Show command history
/save <name>       - Save current session
/load <name>       - Load saved session
/status            - Show pipeline status
/templates         - List available templates
```

### Single Query Mode

Run a single query:
```bash
npm run cli "I want to build a data analysis agent"
```

Or using the advisor directly:
```bash
npm run advisor "Create an automation agent for task scheduling"
```

### Development Mode

Run in development with hot reload:
```bash
npm run dev
```

Build the project:
```bash
npm run build
```

Run compiled version:
```bash
npm start
```

---

## Programmatic Usage

### Using the Pipeline API

```typescript
import { AgentGenerationPipeline } from './src/pipeline.js';
import type { InterviewResponse } from './src/types/agent.js';

// Create pipeline instance
const pipeline = new AgentGenerationPipeline();

// Prepare interview responses
const responses: Record<string, InterviewResponse> = {
  agent_name: 'My Custom Agent',
  primary_use_case: 'Data analysis and visualization',
  target_users: 'Business analysts',
  // ... other responses
};

// Run full pipeline
const result = await pipeline.runFullPipeline(responses, {
  outputDir: './generated-agents',
  autoPackage: true,
  includeExamples: true,
  includeTests: true,
  verboseLogging: true,
  promptVerbosity: 'detailed',
});

if (result.success) {
  console.log('Agent generated successfully!');
  console.log('Template:', result.recommendations?.agentType);
  console.log('Output:', result.packageResult?.outputDir);
} else {
  console.error('Generation failed:', result.errors);
}
```

### Interactive Interview

```typescript
import { AgentGenerationPipeline } from './src/pipeline.js';

const pipeline = new AgentGenerationPipeline();

// Run interactive interview
const requirements = await pipeline.runInteractiveInterview({
  onQuestion: async (question, hint) => {
    console.log(`Q: ${question}`);
    if (hint) console.log(`Hint: ${hint}`);

    // Get user input (example using readline)
    return await getUserInput();
  },
  onProgress: (stage, message) => {
    console.log(`[${stage}] ${message}`);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});

console.log('Requirements:', requirements);
```

### Direct Agent Usage

```typescript
import { createAdvisorAgent } from './src/advisor-agent.js';

const agent = createAdvisorAgent();

const stream = agent.run(
  'I need an agent that analyzes customer feedback from CSV files'
);

for await (const event of stream) {
  if (event.type === 'text') {
    console.log(event.text);
  } else if (event.type === 'tool_use') {
    console.log(`Using tool: ${event.name}`);
  }
}
```

### Using Individual Generators

```typescript
import { CodeGenerator, PromptGenerator, ConfigGenerator } from './src/lib/generation/index.js';
import type { AgentRequirements } from './src/types/agent.js';

const requirements: AgentRequirements = {
  agentName: 'My Agent',
  primaryUseCase: 'Data analysis',
  // ... other fields
};

// Generate code
const codeGen = new CodeGenerator();
const code = codeGen.generateFullCode({
  templateId: 'data-analyst',
  agentName: 'My Agent',
  requirements,
  includeComments: true,
});

// Generate prompt
const promptGen = new PromptGenerator();
const prompt = promptGen.generate({
  templateId: 'data-analyst',
  requirements,
  verbosityLevel: 'detailed',
});

// Generate configs
const configGen = new ConfigGenerator();
const packageJson = configGen.generatePackageJSON({
  templateId: 'data-analyst',
  agentName: 'My Agent',
  requirements,
});
```

---

## Customization Guide

### Customizing System Prompts

Modify the generated system prompt for your specific needs:

```typescript
import { PromptGenerator } from './src/lib/generation/prompt-generator.js';

const generator = new PromptGenerator();

// Generate base prompt
const basePrompt = generator.generate({
  templateId: 'data-analyst',
  requirements,
  verbosityLevel: 'standard',
});

// Add custom sections
const customPrompt = `${basePrompt}

## Custom Guidelines

- Always validate data before processing
- Use specific statistical methods: mean, median, std deviation
- Generate charts with company brand colors
- Include executive summary in all reports
`;
```

### Adding Custom Tools

Extend generated agents with custom tools:

```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Define custom tool
const customTool = tool({
  name: 'send_email_report',
  description: 'Send analysis report via email',
  input_schema: z.object({
    recipient: z.string().email(),
    subject: z.string(),
    reportData: z.object({
      summary: z.string(),
      attachments: z.array(z.string()),
    }),
  }),
  async execute({ recipient, subject, reportData }) {
    // Implementation
    return { success: true };
  },
});

// Add to generated agent
agent.tool(customTool);
```

### Customizing Package Output

Control what gets generated:

```typescript
import { AgentPackager } from './src/lib/export/packager.js';

const packager = new AgentPackager();

const result = await packager.packageAgent({
  outputDir: './my-custom-agent',
  agentName: 'Custom Agent',
  templateId: 'data-analyst',
  requirements,
  recommendations,
  includeExamples: true,        // Include example files
  includeTests: true,            // Include test scaffolding
  includeDocumentation: true,    // Include full docs
  createZip: false,              // Don't create ZIP archive
});
```

---

## Best Practices

### 1. Interview Best Practices

**Be Specific:**
```
❌ Bad: "I want a data agent"
✅ Good: "I need an agent that reads CSV sales data, calculates monthly trends, and generates PDF reports"
```

**Include Context:**
```
❌ Bad: "Make it work with files"
✅ Good: "Target users are business analysts who work with CSV files up to 100MB containing sales transactions"
```

**Specify Requirements:**
```
❌ Bad: "It should be good"
✅ Good: "Must handle missing data gracefully, validate CSV format, and retry failed operations"
```

### 2. Template Selection

- **Data Analyst:** Structured data processing, statistical analysis, reporting
- **Content Creator:** Writing, SEO, multi-format content generation
- **Code Assistant:** Code quality, security scanning, refactoring
- **Research Agent:** Web data gathering, fact verification, research compilation
- **Automation Agent:** Task scheduling, workflow orchestration, monitoring

Choose based on **primary capability** needed, not secondary features.

### 3. Deployment Considerations

**Local Development:**
```typescript
// Use lower complexity, faster iterations
const result = await pipeline.runFullPipeline(responses, {
  includeExamples: true,
  includeTests: false,
  verboseLogging: true,
});
```

**Production Deployment:**
```typescript
// Include tests, minimize examples
const result = await pipeline.runFullPipeline(responses, {
  includeExamples: false,
  includeTests: true,
  verboseLogging: false,
});
```

### 4. Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await pipeline.runFullPipeline(responses);

  if (!result.success) {
    console.error('Generation failed:');
    result.errors?.forEach(err => console.error(`  - ${err}`));
  }

  if (result.warnings?.length) {
    console.warn('Warnings:');
    result.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }
} catch (error) {
  console.error('Fatal error:', error);
  // Implement retry logic or fallback
}
```

### 5. Performance Optimization

**Batch Processing:**
```typescript
// Generate multiple agents in parallel
const agents = await Promise.all([
  pipeline.runFullPipeline(responses1, { autoPackage: false }),
  pipeline.runFullPipeline(responses2, { autoPackage: false }),
  pipeline.runFullPipeline(responses3, { autoPackage: false }),
]);
```

**Minimize Output:**
```typescript
// For CI/CD pipelines
const result = await pipeline.runFullPipeline(responses, {
  verboseLogging: false,
  includeExamples: false,
  promptVerbosity: 'concise',
});
```

### 6. Testing Generated Agents

```bash
# Navigate to generated agent
cd generated-agents/my-agent

# Install dependencies
npm install

# Run tests (if included)
npm test

# Start the agent
npm start
```

### 7. Version Control

**What to Commit:**
- Generated source code (`src/`)
- Configuration files (`package.json`, `tsconfig.json`)
- Documentation (`README.md`, `IMPLEMENTATION.md`)
- `.gitignore` file

**What NOT to Commit:**
- `.env` file (use `.env.example`)
- `node_modules/`
- Generated artifacts in `dist/`
- Session data

### 8. Security Considerations

- **Never commit API keys** - Use `.env` files and environment variables
- **Validate user inputs** - Always sanitize data before processing
- **Review generated code** - Understand what the agent will do before deployment
- **Limit file system access** - Restrict agent to necessary directories only
- **Monitor usage** - Track API calls and costs in production

---

## Additional Resources

- [Claude Agent SDK Documentation](https://docs.anthropic.com/agent-sdk)
- [MiniMax API Reference](https://www.minimax.ai/docs)
- [Project GitHub Repository](https://github.com/anthropics/agent-advisor)
- [Report Issues](https://github.com/anthropics/agent-advisor/issues)

---

**Need Help?**

If you encounter issues or have questions:

1. Check the `IMPLEMENTATION.md` guide in your generated project
2. Review the troubleshooting section in the generated `README.md`
3. Consult the Agent SDK primers in `Agent SDK Primers/`
4. Open an issue on GitHub with detailed information

Happy agent building! 🚀
