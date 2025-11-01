# Agent Advisor MVP - Product Requirements Document

**Project**: Claude Agent Advisor (MiniMax SDK Edition)
**Purpose**: Interactive advisory tool for building Claude agents using Claude Agent SDK + MiniMax API
**Target Completion**: 2 weeks
**Tech Stack**: TypeScript + Claude Agent SDK + MiniMax-M2 Model

---

## Executive Summary

An AI-powered advisor agent that guides developers through creating custom Claude agents via structured consultation. The advisor conducts an interactive interview, analyzes requirements, and generates complete, working agent implementations using the Claude Agent SDK with MiniMax API integration.

**Key Innovation**: Unlike traditional documentation or templates, this is an *agent that builds agents* - using the Claude Agent SDK to create a conversational advisor that generates customized agent code, configurations, and implementation guides.

---

## Product Vision

### What It Does
1. **Interactive Interview** - Conducts structured discovery conversation to understand agent requirements
2. **Intelligent Classification** - Analyzes responses to recommend appropriate agent architectures
3. **Code Generation** - Produces working TypeScript agent implementations using Claude Agent SDK
4. **Configuration Output** - Generates MiniMax API configurations and system prompts
5. **Implementation Guidance** - Provides step-by-step deployment and testing instructions

### What Makes It Unique
- **Agent-Built Architecture** - Uses Claude Agent SDK to build the advisor itself (dogfooding)
- **MiniMax Integration** - Leverages MiniMax-M2's extended context and thinking capabilities
- **End-to-End Solution** - From concept to working code in <10 minutes
- **SDK-Native** - All generated agents use official Claude Agent SDK patterns

---

## Technical Architecture

### Core Component: The Advisor Agent

```typescript
// advisor-agent.ts - The main advisor using Claude Agent SDK
import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const advisorAgent = new Agent({
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN,
  model: 'MiniMax-M2',

  systemPrompt: `You are an expert AI agent architect specializing in the Claude Agent SDK.
Your role is to:
1. Conduct structured interviews to understand developer needs
2. Recommend appropriate agent architectures and patterns
3. Generate production-ready agent implementations
4. Provide clear implementation guidance

You have deep knowledge of:
- Claude Agent SDK patterns (TypeScript & Python)
- MiniMax API configuration and JWT authentication
- Tool integration and MCP servers
- System prompt optimization
- Agent testing and deployment best practices

Conduct the interview in 4 stages:
1. Discovery - Understand the agent's purpose
2. Requirements - Identify needed capabilities (memory, file access, web, tools)
3. Architecture - Define interaction style and tool configurations
4. Output - Generate complete implementation artifacts`,

  tools: [
    // Interview management tools
    {
      name: 'ask_interview_question',
      description: 'Ask the next question in the interview flow',
      input_schema: z.object({
        stage: z.enum(['discovery', 'requirements', 'architecture', 'output']),
        question: z.string(),
        question_type: z.enum(['text', 'choice', 'multiselect', 'boolean'])
      }),
      handler: async ({ stage, question, question_type }) => {
        // Tool implementation
      }
    },

    {
      name: 'classify_agent_type',
      description: 'Classify agent based on interview responses',
      input_schema: z.object({
        purpose: z.string(),
        category: z.enum(['data-processing', 'creative', 'analytical', 'automation', 'other']),
        capabilities: z.object({
          needsMemory: z.boolean(),
          needsFileAccess: z.boolean(),
          needsWebAccess: z.boolean(),
          needsToolUse: z.boolean()
        }),
        interactionStyle: z.enum(['conversational', 'task-focused', 'collaborative'])
      }),
      handler: async (requirements) => {
        // Classification logic
      }
    },

    {
      name: 'generate_agent_code',
      description: 'Generate complete agent implementation code',
      input_schema: z.object({
        agentType: z.string(),
        requirements: z.object({
          purpose: z.string(),
          category: z.string(),
          capabilities: z.record(z.boolean()),
          interactionStyle: z.string(),
          specificTools: z.array(z.string()).optional()
        }),
        template: z.string()
      }),
      handler: async ({ agentType, requirements, template }) => {
        // Code generation logic
      }
    },

    {
      name: 'generate_system_prompt',
      description: 'Create optimized system prompt for the agent',
      input_schema: z.object({
        agentType: z.string(),
        purpose: z.string(),
        capabilities: z.array(z.string()),
        interactionStyle: z.string()
      }),
      handler: async (config) => {
        // System prompt generation
      }
    },

    {
      name: 'generate_implementation_guide',
      description: 'Create step-by-step implementation instructions',
      input_schema: z.object({
        agentName: z.string(),
        requiredDependencies: z.array(z.string()),
        mcpServers: z.array(z.string()),
        complexity: z.enum(['simple', 'moderate', 'complex'])
      }),
      handler: async (config) => {
        // Guide generation logic
      }
    }
  ]
});
```

### Agent Template System

**5 Pre-Built Templates** (MVP Scope):

#### 1. Data Analyst Agent
```typescript
// templates/data-analyst-template.ts
export const dataAnalystTemplate = {
  id: 'data-analyst',
  name: 'Data Analyst Agent',
  category: 'data-processing',
  capabilities: {
    needsMemory: true,
    needsFileAccess: true,
    needsWebAccess: false,
    needsToolUse: true
  },
  tools: [
    {
      name: 'read_csv',
      description: 'Read and parse CSV files',
      input_schema: z.object({
        filePath: z.string(),
        parseOptions: z.object({
          delimiter: z.string().optional(),
          hasHeaders: z.boolean().optional()
        }).optional()
      })
    },
    {
      name: 'analyze_data',
      description: 'Perform statistical analysis',
      input_schema: z.object({
        data: z.array(z.record(z.any())),
        analysisType: z.enum(['descriptive', 'correlation', 'regression'])
      })
    },
    {
      name: 'generate_visualization',
      description: 'Create data visualization',
      input_schema: z.object({
        data: z.array(z.record(z.any())),
        chartType: z.enum(['bar', 'line', 'scatter', 'pie']),
        outputPath: z.string()
      })
    }
  ],
  systemPrompt: `You are a data analyst...`,
  starterCode: `/* Full TypeScript implementation */`
};
```

#### 2. Content Creator Agent
- Blog posts, documentation, marketing copy
- Tools: `generate_outline`, `write_section`, `optimize_for_seo`

#### 3. Code Assistant Agent
- Code review, debugging, refactoring
- Tools: `analyze_code`, `suggest_improvements`, `generate_tests`

#### 4. Research Agent
- Web search, summarization, fact-checking
- Tools: `web_search`, `scrape_content`, `extract_facts`, `verify_sources`

#### 5. Automation Agent
- Task orchestration and workflow automation
- Tools: `schedule_task`, `execute_workflow`, `monitor_status`

---

## MVP Feature Specification

### Phase 1: Core Interview Engine (Days 1-3)

#### Interview Flow State Machine
```typescript
interface InterviewState {
  sessionId: string;
  currentStage: 'discovery' | 'requirements' | 'architecture' | 'output' | 'complete';
  currentQuestionIndex: number;
  responses: Response[];
  requirements: Partial<AgentRequirements>;
  recommendations: AgentRecommendations | null;
  isComplete: boolean;
}

interface Response {
  questionId: string;
  value: string | boolean | string[];
  timestamp: Date;
}
```

#### Interview Questions Structure
```typescript
const INTERVIEW_QUESTIONS = [
  // Discovery Stage
  {
    id: 'purpose',
    stage: 'discovery',
    text: 'What is the primary purpose of your agent?',
    type: 'text',
    required: true,
    followUp: 'Can you provide 2-3 example tasks?'
  },
  {
    id: 'category',
    stage: 'discovery',
    text: 'Which category best describes your agent?',
    type: 'choice',
    options: [
      'Data Processing - Analyze and transform data',
      'Creative - Generate content, write, design',
      'Analytical - Research, summarize, provide insights',
      'Automation - Perform repetitive tasks',
      'Other - Something else'
    ],
    required: true
  },

  // Requirements Stage
  {
    id: 'memory',
    stage: 'requirements',
    text: 'Does your agent need to remember information across conversations?',
    type: 'boolean',
    required: true
  },
  {
    id: 'file-access',
    stage: 'requirements',
    text: 'Will your agent need to read or write files?',
    type: 'boolean',
    required: true
  },
  {
    id: 'web-access',
    stage: 'requirements',
    text: 'Should your agent be able to access the web?',
    type: 'boolean',
    required: true
  },

  // Architecture Stage
  {
    id: 'interaction-style',
    stage: 'architecture',
    text: 'How should users interact with your agent?',
    type: 'choice',
    options: [
      'Conversational - Natural dialogue and discussion',
      'Task-focused - Direct commands and responses',
      'Collaborative - Working together on problems'
    ],
    required: true
  },
  {
    id: 'specific-tools',
    stage: 'architecture',
    text: 'Are there specific tools or APIs your agent should use?',
    type: 'text',
    required: false,
    hint: 'Comma-separated list (e.g., GitHub API, Slack, PostgreSQL)'
  }
];
```

### Phase 2: Template & Generation System (Days 4-6)

#### Agent Classifier
```typescript
class AgentClassifier {
  classify(requirements: AgentRequirements): AgentRecommendations {
    // Pattern matching logic
    const template = this.findBestTemplate(requirements);

    return {
      agentType: template.name,
      requiredDependencies: this.getDependencies(template),
      mcpServers: this.getMCPServers(requirements),
      systemPrompt: this.generateSystemPrompt(template, requirements),
      starterCode: this.generateCode(template, requirements),
      toolConfigurations: this.configureTools(template, requirements),
      estimatedComplexity: this.assessComplexity(requirements),
      implementationSteps: this.generateSteps(template, requirements)
    };
  }

  private findBestTemplate(requirements: AgentRequirements): AgentTemplate {
    // Score each template based on requirements match
    const scores = this.templates.map(template => ({
      template,
      score: this.scoreMatch(template, requirements)
    }));

    return scores.sort((a, b) => b.score - a.score)[0].template;
  }
}
```

#### Code Generator
```typescript
class CodeGenerator {
  generate(template: AgentTemplate, requirements: AgentRequirements): string {
    return `
import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const agent = new Agent({
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN,
  model: 'MiniMax-M2',

  systemPrompt: \`${this.customizeSystemPrompt(template, requirements)}\`,

  tools: [
    ${this.generateTools(template, requirements)}
  ]
});

// Query handler
async function handleQuery(userMessage: string) {
  const response = agent.query(userMessage);

  for await (const event of response) {
    if (event.type === 'text') {
      console.log(event.text);
    } else if (event.type === 'thinking') {
      console.log('[Thinking]', event.thinking);
    } else if (event.type === 'tool_use') {
      console.log('[Tool]', event.name);
    }
  }
}

// Main execution
const userQuery = process.argv[2] || '${this.getExampleQuery(requirements)}';
handleQuery(userQuery).catch(console.error);
`;
  }
}
```

### Phase 3: Output & Export System (Days 7-9)

#### Generated Artifacts

**1. Agent Implementation File** (`my-agent.ts`)
- Complete TypeScript agent code
- Tool definitions with Zod schemas
- Error handling and validation
- Example usage and test cases

**2. Configuration File** (`agent-config.json`)
```json
{
  "name": "My Custom Agent",
  "version": "1.0.0",
  "description": "Generated agent description",
  "apiConfig": {
    "baseUrl": "https://api.minimax.io/anthropic",
    "model": "MiniMax-M2",
    "authMethod": "jwt"
  },
  "capabilities": {
    "memory": true,
    "fileAccess": false,
    "webAccess": true
  },
  "mcpServers": [
    {
      "name": "filesystem",
      "version": "1.0.0",
      "configuration": {}
    }
  ]
}
```

**3. Environment Template** (`.env.example`)
```env
MINIMAX_JWT_TOKEN=your_jwt_token_here
CLI_PATH=/Users/username/.claude/local/claude
LOG_LEVEL=info
```

**4. Implementation Guide** (`IMPLEMENTATION.md`)
```markdown
# Implementation Guide: [Agent Name]

## Prerequisites
- Node.js 18+
- Claude Agent SDK
- MiniMax API access

## Installation

1. Install dependencies:
\`\`\`bash
npm install @anthropic-ai/claude-agent-sdk zod
\`\`\`

2. Configure environment:
\`\`\`bash
cp .env.example .env
# Edit .env with your MiniMax JWT token
\`\`\`

3. Test the agent:
\`\`\`bash
tsx my-agent.ts "Test query"
\`\`\`

## Usage Examples

[Specific examples based on agent type]

## Troubleshooting

[Common issues and solutions]
```

**5. README** (`README.md`)
- Agent overview and capabilities
- Quick start guide
- API reference
- Examples and use cases

### Phase 4: Testing & Deployment (Days 10-12)

#### Agent Testing Framework
```typescript
// test-advisor.ts
import { advisorAgent } from './advisor-agent';

async function testInterviewFlow() {
  console.log('Testing: Complete interview flow');

  // Test discovery stage
  const discoveryResponse = await advisorAgent.query(
    'I want to build an agent that analyzes CSV data and generates reports'
  );

  // Validate interview questions are asked
  // Validate responses are collected
  // Validate classification happens correctly

  console.log('✅ Interview flow test passed');
}

async function testCodeGeneration() {
  console.log('Testing: Code generation for data analyst agent');

  const requirements = {
    purpose: 'Analyze sales data',
    category: 'data-processing',
    capabilities: {
      needsMemory: false,
      needsFileAccess: true,
      needsWebAccess: false,
      needsToolUse: true
    },
    interactionStyle: 'task-focused'
  };

  // Generate code
  const code = await advisorAgent.query(
    `Generate a complete agent implementation for: ${JSON.stringify(requirements)}`
  );

  // Validate generated code
  // - Contains Agent SDK import
  // - Has valid systemPrompt
  // - Includes appropriate tools
  // - TypeScript compiles without errors

  console.log('✅ Code generation test passed');
}

// Run all tests
testInterviewFlow()
  .then(() => testCodeGeneration())
  .catch(console.error);
```

---

## File Structure

```
agent-advisor/
├── src/
│   ├── advisor-agent.ts              # Main advisor agent implementation
│   ├── templates/
│   │   ├── data-analyst.ts           # Data analyst template
│   │   ├── content-creator.ts        # Content creator template
│   │   ├── code-assistant.ts         # Code assistant template
│   │   ├── research-agent.ts         # Research agent template
│   │   ├── automation-agent.ts       # Automation agent template
│   │   └── template-types.ts         # Shared template interfaces
│   ├── lib/
│   │   ├── interview/
│   │   │   ├── questions.ts          # Interview question definitions
│   │   │   ├── state-manager.ts      # Interview state management
│   │   │   └── validator.ts          # Response validation
│   │   ├── classification/
│   │   │   ├── classifier.ts         # Agent type classification
│   │   │   └── scoring.ts            # Template matching scores
│   │   ├── generation/
│   │   │   ├── code-generator.ts     # Agent code generation
│   │   │   ├── prompt-generator.ts   # System prompt generation
│   │   │   └── config-generator.ts   # Configuration file generation
│   │   └── export/
│   │       ├── file-writer.ts        # Write generated files
│   │       └── packager.ts           # Package as ZIP/tarball
│   ├── types/
│   │   ├── agent.ts                  # Agent-related types
│   │   └── advisor.ts                # Advisor-specific types
│   └── utils/
│       ├── minimax-config.ts         # MiniMax API configuration
│       └── validation.ts             # Schema validation utilities
├── tests/
│   ├── advisor-agent.test.ts         # Advisor agent tests
│   ├── interview.test.ts             # Interview flow tests
│   ├── classification.test.ts        # Classifier tests
│   └── generation.test.ts            # Code generation tests
├── examples/
│   ├── generated-data-analyst/       # Example generated agent
│   ├── generated-content-creator/    # Example generated agent
│   └── usage-examples.md             # Usage documentation
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Development Timeline

### Week 1: Core Implementation

**Days 1-2: Project Setup & Interview Engine**
- [ ] Initialize TypeScript project with Claude Agent SDK
- [ ] Configure MiniMax API integration
- [ ] Implement interview state machine
- [ ] Define all interview questions
- [ ] Create response validation logic
- [ ] Build basic CLI interface for testing

**Days 3-4: Template System**
- [ ] Define AgentTemplate interface
- [ ] Implement 5 agent templates (data analyst, content creator, code assistant, research, automation)
- [ ] Create template matching/scoring algorithm
- [ ] Build classifier with pattern matching
- [ ] Test classification with sample requirements

**Days 5-6: Code Generation**
- [ ] Implement code generator for TypeScript agents
- [ ] Create system prompt generator
- [ ] Build configuration file generator
- [ ] Add tool definition generator with Zod schemas
- [ ] Generate example queries and test cases

**Day 7: Integration**
- [ ] Connect interview → classification → generation pipeline
- [ ] Implement end-to-end flow in advisor agent
- [ ] Add error handling and validation
- [ ] Test complete workflow with all 5 templates

### Week 2: Polish & Deploy

**Days 8-9: Export & Documentation**
- [ ] Implement file export system (single files + ZIP packages)
- [ ] Generate implementation guides
- [ ] Create README templates
- [ ] Add environment file templates
- [ ] Build example usage documentation

**Days 10-11: Testing**
- [ ] Write comprehensive unit tests
- [ ] Test all 5 agent templates end-to-end
- [ ] Validate generated code compiles and runs
- [ ] Test edge cases and error handling
- [ ] User acceptance testing

**Days 12-14: Refinement & Launch**
- [ ] Polish output formatting
- [ ] Improve error messages
- [ ] Add helpful hints and guidance
- [ ] Update documentation
- [ ] Create demo video/walkthrough
- [ ] Prepare for deployment

---

## Success Metrics

### MVP Acceptance Criteria

✅ **Functional Requirements**
- Advisor conducts complete interview (7+ questions across 4 stages)
- Correctly classifies 5 different agent types
- Generates valid TypeScript code using Claude Agent SDK
- Produces working MiniMax API configurations
- Exports complete implementation packages

✅ **Quality Requirements**
- Generated agents compile without TypeScript errors
- Generated code follows Claude Agent SDK best practices
- System prompts are clear and effective
- Implementation guides are complete and accurate
- 90%+ test coverage on core logic

✅ **Performance Requirements**
- Interview completion in <5 minutes
- Code generation in <30 seconds
- End-to-end flow (start → working agent) in <10 minutes

### Success Indicators
- Advisor successfully generates 5 distinct agent types
- Generated agents run on first try (80%+ success rate)
- Code quality passes linting and type-checking
- Documentation is clear and complete
- No critical bugs in core flows

---

## Risk Mitigation

### Technical Risks

**Risk: Complex interview logic becomes unmaintainable**
- Mitigation: Use state machine pattern with clear stages
- Mitigation: Extensive unit tests for state transitions

**Risk: Generated code has errors or doesn't compile**
- Mitigation: Use templates with proven, tested code
- Mitigation: Automated TypeScript compilation checks
- Mitigation: Schema validation with Zod

**Risk: MiniMax API integration issues**
- Mitigation: Follow validated patterns from minimax-agent-builder workspace
- Mitigation: Comprehensive error handling
- Mitigation: Fallback to standard Anthropic API if needed

**Risk: System prompts don't produce desired behavior**
- Mitigation: Use battle-tested prompts from template examples
- Mitigation: A/B testing of prompt variations
- Mitigation: User feedback loop for improvements

### Scope Risks

**Risk: Feature creep beyond MVP scope**
- Mitigation: Strict adherence to 5 templates for MVP
- Mitigation: Document "future enhancements" separately
- Mitigation: Time-box development to 2 weeks

**Risk: Over-engineering the solution**
- Mitigation: Start with simple, working implementations
- Mitigation: Focus on end-to-end flow first, optimize later
- Mitigation: Use existing patterns from agent-advisor inspiration

---

## Future Enhancements (Post-MVP)

### Phase 2: Enhanced Capabilities
- [ ] Python agent generation (in addition to TypeScript)
- [ ] Interactive code editor with live preview
- [ ] Cost estimation calculator
- [ ] 10+ additional agent templates
- [ ] MCP server marketplace integration
- [ ] Agent testing framework with sample test cases

### Phase 3: Platform Features
- [ ] Web UI (React frontend) instead of CLI only
- [ ] Save/load agent configurations
- [ ] Community template sharing
- [ ] Template versioning and updates
- [ ] Multi-agent orchestration patterns
- [ ] Agent performance analytics

### Phase 4: Enterprise
- [ ] Private template libraries
- [ ] Team collaboration features
- [ ] SSO/SAML authentication
- [ ] Audit logs and usage tracking
- [ ] SLA guarantees and priority support
- [ ] API access for programmatic agent generation

---

## Key Design Decisions

### Why Claude Agent SDK?
- Official Anthropic SDK with first-class support
- Proven patterns and best practices built-in
- Async streaming with AsyncGenerator pattern
- Strong TypeScript types and Zod integration
- Active development and community

### Why MiniMax API?
- Extended context windows for complex agent logic
- Thinking blocks for transparent reasoning
- Cost-effective for development and testing
- JWT authentication for enhanced security
- Compatible with Claude Agent SDK

### Why TypeScript Only for MVP?
- Faster development (single language)
- Better type safety for code generation
- Easier to validate generated code
- Python can be added in Phase 2
- TypeScript has better tooling for this use case

### Why 5 Templates?
- Covers 80% of common use cases
- Manageable scope for 2-week MVP
- Sufficient to prove concept
- Easy to add more post-MVP
- Each represents distinct category

### Why CLI First?
- Simplest MVP implementation
- No frontend complexity
- Easy to test and iterate
- Can wrap in web UI later
- Matches target developer audience

---

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.30",
    "zod": "^3.22.4",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  }
}
```

### Environment Requirements
- Node.js 18+
- TypeScript 5.3+
- MiniMax API access with JWT token
- Claude CLI (optional, for testing generated agents)

---

## Implementation Notes

### MiniMax Configuration Pattern
```typescript
// Validated MiniMax setup from minimax-agent-builder workspace
const minimaxConfig = {
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN,
  model: 'MiniMax-M2',

  // Optional: Claude CLI path for some operations
  cliPath: '/Users/username/.claude/local/claude'
};
```

### Interview State Persistence
```typescript
// Save interview state for resume capability
interface PersistedState {
  sessionId: string;
  timestamp: Date;
  interviewState: InterviewState;
  partialRequirements: Partial<AgentRequirements>;
}

// Enable resume-interrupted-interview feature
function saveState(state: PersistedState): void {
  fs.writeFileSync(
    `./sessions/${state.sessionId}.json`,
    JSON.stringify(state, null, 2)
  );
}
```

### Code Generation Best Practices
```typescript
// Ensure generated code is:
// 1. TypeScript strict mode compatible
// 2. Properly formatted
// 3. Includes error handling
// 4. Has example usage
// 5. Follows Claude Agent SDK patterns

function validateGeneratedCode(code: string): boolean {
  // TypeScript compilation check
  // Zod schema validation
  // SDK pattern conformance
  // Error handling presence
  return true;
}
```

---

## Conclusion

This MVP delivers a working "agent that builds agents" using the Claude Agent SDK with MiniMax API integration. The 2-week timeline is achievable by focusing on:

1. ✅ **Proven Patterns** - Reuse validated code from minimax-agent-builder workspace
2. ✅ **Scope Discipline** - Strict adherence to 5 templates and core features
3. ✅ **Template-Driven** - Start with working code, customize vs. generate from scratch
4. ✅ **SDK-Native** - Leverage Claude Agent SDK capabilities fully
5. ✅ **Iterative Testing** - Test each component as it's built

The result is a production-ready advisor that can generate complete, working agent implementations in minutes, serving as both a powerful development tool and a showcase of the Claude Agent SDK's capabilities.
