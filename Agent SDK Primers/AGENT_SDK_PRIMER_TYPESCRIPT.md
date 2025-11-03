# Claude Agent SDK with MiniMax - Developer Primer

> **Purpose**: Comprehensive reference guide for building agents with Claude Agent SDK using MiniMax API
> **Last Updated**: 2025-11-01
> **Target Audience**: Claude Code agents assisting with agent development

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [MiniMax Configuration](#minimax-configuration)
3. [SDK Architecture](#sdk-architecture)
4. [Core Patterns](#core-patterns)
5. [Tool Development](#tool-development)
6. [Response Handling](#response-handling)
7. [Common Pitfalls](#common-pitfalls)
8. [Best Practices](#best-practices)
9. [Testing Strategy](#testing-strategy)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Project Setup

```bash
# Initialize project
npm init -y
npm install @anthropic-ai/claude-agent-sdk zod
npm install --save-dev typescript @types/node tsx

# Project structure
.
├── package.json
├── tsconfig.json (optional but recommended)
├── src/
│   ├── agents/          # Agent definitions
│   ├── tools/           # Tool implementations
│   └── utils/           # Helper functions
└── tests/               # Test suites
```

### Minimal Working Example

```typescript
#!/usr/bin/env node
import { query } from '@anthropic-ai/claude-agent-sdk';

// Configure MiniMax
process.env.ANTHROPIC_BASE_URL = "https://api.minimax.io/anthropic";
process.env.ANTHROPIC_API_KEY = "your_minimax_jwt_token";

// Simple query
const session = query({
  prompt: "Hello! What can you do?"
});

// Extract response
let response = '';
for await (const message of session) {
  if (message.type === 'assistant' && message.message?.content) {
    for (const block of message.message.content) {
      if (block.type === 'text') {
        response += block.text;
      }
    }
  }
}

console.log(response);
```

---

## MiniMax Configuration

### Authentication Setup

MiniMax uses JWT tokens for authentication. The token is obtained from the MiniMax platform and must be configured as `ANTHROPIC_API_KEY`.

```typescript
// Environment configuration
process.env.ANTHROPIC_BASE_URL = "https://api.minimax.io/anthropic";
process.env.ANTHROPIC_API_KEY = "eyJhbGc..."; // Your MiniMax JWT token

// Alternative: Use .env file
// Create .env file:
// ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
// ANTHROPIC_API_KEY=your_jwt_token

// Load with dotenv
import 'dotenv/config';
```

### Current Working Configuration

**Base URL**: `https://api.minimax.io/anthropic`
**Auth Token**: Retrieved from `/Users/ambrealismwork/.local/bin/ccmm` wrapper script
**Model**: `MiniMax-M2`

```bash
# Check current MiniMax configuration
cat ~/.local/bin/ccmm | grep "ANTHROPIC"
```

### Token Management

- **Format**: JWT (JSON Web Token)
- **Location**: MiniMax Platform → API Keys
- **Expiration**: Check token periodically for expiration
- **Security**: Never commit tokens to version control

---

## SDK Architecture

### Core Concepts

The Claude Agent SDK operates fundamentally differently from the standard Anthropic SDK:

#### 1. **Streaming by Default**

The `query()` function returns an **AsyncGenerator**, not a promise with a complete response.

```typescript
// ❌ WRONG - This doesn't give you the response text
const result = await query({ prompt: "Hello" });
console.log(result); // Prints session object, not response

// ✅ CORRECT - Iterate through the stream
const session = query({ prompt: "Hello" });
for await (const message of session) {
  // Process messages
}
```

#### 2. **Message Types**

The stream yields different message types:

- `system` - System initialization messages
- `assistant` - AI responses (partial and complete)
- `result` - Final result/completion message
- `user` - User messages (replays)
- `tool_use` - Tool execution messages

```typescript
interface SDKMessage {
  type: 'system' | 'assistant' | 'result' | 'user' | 'tool_use' | ...;
  message?: {
    content: Array<{
      type: 'text' | 'thinking' | 'tool_use';
      text?: string;
      thinking?: string;
      // ... other fields
    }>;
  };
}
```

#### 3. **Session-Based Architecture**

Each `query()` call creates a session that manages:
- API communication
- Tool execution
- Permission handling
- Context management
- State persistence

---

## Core Patterns

### Pattern 1: Basic Query (No Tools)

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function simpleQuery(prompt: string): Promise<string> {
  const session = query({ prompt });

  let response = '';
  for await (const message of session) {
    if (message.type === 'assistant' && message.message?.content) {
      for (const block of message.message.content) {
        if (block.type === 'text') {
          response += block.text;
        }
      }
    }
  }

  return response;
}
```

### Pattern 2: Query with System Prompt

```typescript
async function queryWithSystem(prompt: string, systemPrompt: string): Promise<string> {
  const session = query({
    prompt,
    options: {
      systemPrompt
    }
  });

  return extractResponse(session);
}
```

### Pattern 3: Query with Tools

```typescript
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Define tool
const calculator = tool(
  'calculator',
  'Performs basic arithmetic operations',
  z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }),
  async ({ operation, a, b }) => {
    switch (operation) {
      case 'add': return { result: a + b };
      case 'subtract': return { result: a - b };
      case 'multiply': return { result: a * b };
      case 'divide': return { result: a / b };
    }
  }
);

// Use tool in query
async function queryWithTools(prompt: string) {
  const session = query({
    prompt,
    options: {
      systemPrompt: 'You are a helpful math assistant. Use the calculator tool for all calculations.',
      tools: [calculator]
    }
  });

  return extractResponse(session);
}
```

### Pattern 4: Multi-Turn Conversation

```typescript
async function* conversation(systemPrompt: string) {
  const messages: Array<{ role: string; content: string }> = [];

  while (true) {
    const userInput = yield; // Get input from caller

    const session = query({
      prompt: userInput,
      options: {
        systemPrompt,
        // Context can be managed through prompt engineering
        // or by maintaining message history
      }
    });

    const response = await extractResponse(session);
    yield response;
  }
}
```

---

## Tool Development

### Tool Definition Structure

Tools are defined using Zod schemas for type safety and validation:

```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const myTool = tool(
  'tool_name',              // Tool identifier (use snake_case)
  'Tool description',       // Clear description of what the tool does
  z.object({                // Input schema (Zod object)
    param1: z.string(),
    param2: z.number().optional()
  }),
  async (input) => {        // Handler function
    // Tool logic here
    return { result: '...' }; // Return object
  }
);
```

### Tool Best Practices

#### 1. **Naming Conventions**

```typescript
// ✅ GOOD - Clear, descriptive names
const searchDatabase = tool('search_database', ...);
const calculateDistance = tool('calculate_distance', ...);

// ❌ BAD - Vague or unclear names
const doThing = tool('do_thing', ...);
const process = tool('process', ...);
```

#### 2. **Schema Design**

```typescript
// ✅ GOOD - Well-structured with validation
const webSearch = tool(
  'web_search',
  'Search the web for information',
  z.object({
    query: z.string().min(1).max(500),
    maxResults: z.number().int().min(1).max(20).default(10),
    safeSearch: z.boolean().default(true)
  }),
  async ({ query, maxResults, safeSearch }) => {
    // Implementation
  }
);

// ❌ BAD - No validation or defaults
const webSearch = tool(
  'web_search',
  'Search',
  z.object({
    q: z.string(),
    n: z.number()
  }),
  async ({ q, n }) => {
    // Implementation
  }
);
```

#### 3. **Error Handling**

```typescript
const databaseQuery = tool(
  'database_query',
  'Query the database',
  z.object({
    sql: z.string(),
    timeout: z.number().default(30000)
  }),
  async ({ sql, timeout }) => {
    try {
      const result = await executeQuery(sql, timeout);
      return {
        success: true,
        data: result,
        rowCount: result.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sql: sql.substring(0, 100) // Truncate for safety
      };
    }
  }
);
```

#### 4. **Response Format**

```typescript
// ✅ GOOD - Structured, informative responses
return {
  success: true,
  data: { /* actual data */ },
  metadata: { timestamp: Date.now(), source: 'api' }
};

// ❌ BAD - Unstructured or minimal responses
return result; // Just raw data
return { ok: true }; // No useful info
```

### Complex Tool Example

```typescript
interface DatabaseRecord {
  id: string;
  name: string;
  created: Date;
}

const databaseTool = tool(
  'database_operations',
  'Perform CRUD operations on the database',
  z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.record(z.unknown()).optional(),
    conditions: z.record(z.unknown()).optional(),
    limit: z.number().int().positive().max(1000).default(100)
  }),
  async ({ operation, table, data, conditions, limit }) => {
    try {
      switch (operation) {
        case 'create':
          if (!data) throw new Error('Data required for create operation');
          const created = await db.insert(table, data);
          return { success: true, operation: 'create', id: created.id };

        case 'read':
          const records = await db.query(table, conditions, limit);
          return { success: true, operation: 'read', records, count: records.length };

        case 'update':
          if (!data || !conditions) throw new Error('Data and conditions required');
          const updated = await db.update(table, data, conditions);
          return { success: true, operation: 'update', updatedCount: updated };

        case 'delete':
          if (!conditions) throw new Error('Conditions required for delete');
          const deleted = await db.delete(table, conditions);
          return { success: true, operation: 'delete', deletedCount: deleted };
      }
    } catch (error) {
      return {
        success: false,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);
```

### Tool Composition

Tools can be composed to create more complex functionality:

```typescript
// Base tools
const fileReader = tool(/* ... */);
const textAnalyzer = tool(/* ... */);
const summarizer = tool(/* ... */);

// Composed workflow
async function analyzeDocument(filePath: string) {
  const session = query({
    prompt: `Analyze the document at ${filePath} and provide a summary`,
    options: {
      systemPrompt: 'You are a document analysis assistant. Use tools to read, analyze, and summarize documents.',
      tools: [fileReader, textAnalyzer, summarizer]
    }
  });

  return extractResponse(session);
}
```

---

## Response Handling

### Standard Response Extractor

Create a reusable helper function:

```typescript
/**
 * Extract text response from query session stream
 * @param session - Query session from query() function
 * @returns Complete response text
 */
async function extractResponse(
  session: ReturnType<typeof query>
): Promise<string> {
  let fullResponse = '';

  for await (const message of session) {
    if (message.type === 'assistant' && message.message?.content) {
      for (const block of message.message.content) {
        if (block.type === 'text') {
          fullResponse += block.text;
        }
      }
    }
  }

  return fullResponse;
}
```

### Advanced Response Handler

Handle different content types:

```typescript
interface ParsedResponse {
  text: string;
  thinking: string;
  toolUses: Array<{ tool: string; input: any }>;
}

async function parseResponse(
  session: ReturnType<typeof query>
): Promise<ParsedResponse> {
  const result: ParsedResponse = {
    text: '',
    thinking: '',
    toolUses: []
  };

  for await (const message of session) {
    if (message.type === 'assistant' && message.message?.content) {
      for (const block of message.message.content) {
        switch (block.type) {
          case 'text':
            result.text += block.text || '';
            break;
          case 'thinking':
            result.thinking += block.thinking || '';
            break;
          case 'tool_use':
            result.toolUses.push({
              tool: block.name || 'unknown',
              input: block.input
            });
            break;
        }
      }
    }
  }

  return result;
}
```

### Streaming Response Handler

For real-time output:

```typescript
async function streamResponse(
  session: ReturnType<typeof query>,
  onChunk: (chunk: string) => void
): Promise<string> {
  let fullResponse = '';

  for await (const message of session) {
    if (message.type === 'assistant' && message.message?.content) {
      for (const block of message.message.content) {
        if (block.type === 'text' && block.text) {
          fullResponse += block.text;
          onChunk(block.text); // Real-time callback
        }
      }
    }
  }

  return fullResponse;
}

// Usage
await streamResponse(session, (chunk) => {
  process.stdout.write(chunk); // Stream to console
});
```

---

## Common Pitfalls

### ❌ Pitfall 1: Treating `query()` as Promise

```typescript
// ❌ WRONG
const response = await query({ prompt: "Hello" });
console.log(response.text); // Error: text doesn't exist

// ✅ CORRECT
const session = query({ prompt: "Hello" });
const response = await extractResponse(session);
console.log(response);
```

### ❌ Pitfall 2: Incorrect Tool Schema

```typescript
// ❌ WRONG - Using plain object instead of Zod
const tool = tool('my_tool', 'description', {
  param: 'string'
}, handler);

// ✅ CORRECT - Using Zod schema
import { z } from 'zod';
const tool = tool('my_tool', 'description',
  z.object({ param: z.string() }),
  handler
);
```

### ❌ Pitfall 3: Not Handling Errors in Tools

```typescript
// ❌ WRONG - Letting errors propagate
const tool = tool('risky_operation', 'desc', schema, async (input) => {
  const result = await riskyAPI(input); // Can throw
  return result;
});

// ✅ CORRECT - Proper error handling
const tool = tool('risky_operation', 'desc', schema, async (input) => {
  try {
    const result = await riskyAPI(input);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});
```

### ❌ Pitfall 4: Incorrect Options Structure

```typescript
// ❌ WRONG - systemPrompt at root level
const session = query({
  prompt: "Hello",
  systemPrompt: "You are helpful" // Wrong placement
});

// ✅ CORRECT - systemPrompt in options
const session = query({
  prompt: "Hello",
  options: {
    systemPrompt: "You are helpful"
  }
});
```

### ❌ Pitfall 5: Not Extracting Token from Environment

```typescript
// ❌ WRONG - Hardcoding token
process.env.ANTHROPIC_API_KEY = "eyJhbGc..."; // Security risk

// ✅ CORRECT - Load from secure location
import 'dotenv/config';
// Or read from secure credential store
const token = await getSecureCredential('minimax_token');
process.env.ANTHROPIC_API_KEY = token;
```

---

## Best Practices

### 1. **Configuration Management**

```typescript
// config.ts
export const config = {
  minimax: {
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'MiniMax-M2',
    timeout: 180000, // 3 minutes
  },
  defaults: {
    systemPrompt: 'You are a helpful AI assistant.',
    maxTokens: 4096,
  }
} as const;

// Validation
if (!config.minimax.apiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}
```

### 2. **Type Safety**

```typescript
// types.ts
import type { z } from 'zod';

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentConfig {
  systemPrompt: string;
  tools: Array<ReturnType<typeof tool>>;
  model?: string;
  temperature?: number;
}

// Use in implementation
function createAgent(config: AgentConfig) {
  // Type-safe agent creation
}
```

### 3. **Logging and Observability**

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function queryWithLogging(prompt: string, options?: any) {
  const startTime = Date.now();
  console.log('[Agent] Starting query:', { prompt, options });

  try {
    const session = query({ prompt, options });
    const response = await extractResponse(session);

    const duration = Date.now() - startTime;
    console.log('[Agent] Query completed:', { duration, responseLength: response.length });

    return response;
  } catch (error) {
    console.error('[Agent] Query failed:', error);
    throw error;
  }
}
```

### 4. **Testing Utilities**

```typescript
// test-utils.ts
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

/**
 * Create a mock tool for testing
 */
export function createMockTool(name: string, response: any) {
  return tool(
    name,
    `Mock tool: ${name}`,
    z.object({ input: z.unknown() }),
    async () => response
  );
}

/**
 * Test helper to verify agent behavior
 */
export async function testAgent(
  prompt: string,
  expectedSubstring: string,
  tools: any[] = []
): Promise<boolean> {
  const session = query({
    prompt,
    options: { tools }
  });

  const response = await extractResponse(session);
  return response.includes(expectedSubstring);
}

/**
 * Performance test helper
 */
export async function measureQueryTime(
  prompt: string,
  options?: any
): Promise<{ response: string; duration: number }> {
  const start = Date.now();
  const session = query({ prompt, options });
  const response = await extractResponse(session);
  const duration = Date.now() - start;

  return { response, duration };
}
```

### 5. **Error Recovery**

```typescript
async function resilientQuery(
  prompt: string,
  options?: any,
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const session = query({ prompt, options });
      return await extractResponse(session);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`[Agent] Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}
```

---

## Testing Strategy

### Unit Tests for Tools

```typescript
// calculator.test.ts
import { describe, it, expect } from 'vitest'; // or jest
import { calculator } from './tools/calculator';

describe('Calculator Tool', () => {
  it('should add two numbers', async () => {
    const result = await calculator.handler({ operation: 'add', a: 5, b: 3 });
    expect(result.result).toBe(8);
  });

  it('should handle division by zero', async () => {
    const result = await calculator.handler({ operation: 'divide', a: 5, b: 0 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('division by zero');
  });
});
```

### Integration Tests

```typescript
// agent.integration.test.ts
import { describe, it, expect } from 'vitest';
import { query } from '@anthropic-ai/claude-agent-sdk';

describe('Agent Integration Tests', () => {
  it('should respond to basic queries', async () => {
    const session = query({ prompt: 'Say hello' });
    const response = await extractResponse(session);

    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(0);
  }, 30000); // 30s timeout

  it('should use tools correctly', async () => {
    const session = query({
      prompt: 'What is 15 + 27?',
      options: {
        tools: [calculator],
        systemPrompt: 'Use the calculator tool for math.'
      }
    });

    const response = await extractResponse(session);
    expect(response).toContain('42');
  }, 30000);
});
```

### Test Configuration

```typescript
// vitest.config.ts or jest.config.js
export default {
  testTimeout: 30000, // 30 seconds for API calls
  setupFiles: ['./tests/setup.ts'],
  testMatch: ['**/*.test.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
  },
};

// tests/setup.ts
import 'dotenv/config';

// Ensure test environment is configured
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY must be set for integration tests');
}
```

---

## Troubleshooting

### Issue 1: "Module not found" errors

**Problem**: TypeScript can't find the SDK imports

```bash
# Solution: Ensure SDK is installed locally
npm install @anthropic-ai/claude-agent-sdk zod
npm install --save-dev typescript @types/node tsx

# Verify installation
npm list @anthropic-ai/claude-agent-sdk
```

### Issue 2: Response is `undefined`

**Problem**: Incorrect response extraction

```typescript
// ❌ WRONG
const response = await query({ prompt: "Hello" });
console.log(response.content); // undefined

// ✅ CORRECT
const session = query({ prompt: "Hello" });
const response = await extractResponse(session);
console.log(response);
```

### Issue 3: Tool not being called

**Checklist**:
1. ✅ Tool is included in `options.tools` array
2. ✅ System prompt mentions tool usage
3. ✅ Prompt requires tool functionality
4. ✅ Tool name and description are clear

```typescript
// ✅ CORRECT usage
const session = query({
  prompt: 'Calculate 15 + 27', // Clear task requiring tool
  options: {
    systemPrompt: 'You are a math assistant. Use the calculator tool for calculations.', // Mentions tool
    tools: [calculator] // Tool included
  }
});
```

### Issue 4: Authentication failures

```bash
# Check token
echo $ANTHROPIC_API_KEY

# Verify base URL
echo $ANTHROPIC_BASE_URL

# Test with curl
curl -X POST https://api.minimax.io/anthropic/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"MiniMax-M2","max_tokens":100,"messages":[{"role":"user","content":"Hi"}]}'
```

### Issue 5: Timeout errors

```typescript
// Increase timeout in options
const session = query({
  prompt: "Complex task...",
  options: {
    timeout: 300000 // 5 minutes
  }
});
```

### Issue 6: TypeScript compilation errors

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## Advanced Patterns

### Pattern: Agent Factory

```typescript
interface AgentTemplate {
  name: string;
  systemPrompt: string;
  tools: Array<ReturnType<typeof tool>>;
  examples?: Array<{ input: string; output: string }>;
}

function createAgent(template: AgentTemplate) {
  return async (prompt: string): Promise<string> => {
    const session = query({
      prompt,
      options: {
        systemPrompt: template.systemPrompt,
        tools: template.tools
      }
    });

    return extractResponse(session);
  };
}

// Usage
const mathAgent = createAgent({
  name: 'MathAgent',
  systemPrompt: 'You are a mathematics expert. Use the calculator tool for all calculations.',
  tools: [calculator]
});

const response = await mathAgent('What is 123 * 456?');
```

### Pattern: Agent Pipelines

```typescript
async function pipeline(
  input: string,
  ...agents: Array<(input: string) => Promise<string>>
): Promise<string> {
  let result = input;

  for (const agent of agents) {
    result = await agent(result);
  }

  return result;
}

// Usage
const researchAgent = createAgent({ /* ... */ });
const summaryAgent = createAgent({ /* ... */ });
const translationAgent = createAgent({ /* ... */ });

const result = await pipeline(
  'Topic: Climate Change',
  researchAgent,
  summaryAgent,
  translationAgent
);
```

### Pattern: Tool Middleware

```typescript
function withLogging<T extends z.ZodRawShape>(
  baseTool: ReturnType<typeof tool>
): ReturnType<typeof tool> {
  return tool(
    baseTool.name,
    baseTool.description,
    baseTool.inputSchema,
    async (input) => {
      console.log(`[Tool] ${baseTool.name} called with:`, input);
      const result = await baseTool.handler(input);
      console.log(`[Tool] ${baseTool.name} returned:`, result);
      return result;
    }
  );
}

// Usage
const loggedCalculator = withLogging(calculator);
```

---

## Quick Reference Card

### Essential Commands

```bash
# Install dependencies
npm install @anthropic-ai/claude-agent-sdk zod

# Run TypeScript file
npx tsx your-agent.ts

# Run tests
npm test

# Check MiniMax config
cat ~/.local/bin/ccmm | grep ANTHROPIC
```

### Essential Imports

```typescript
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
```

### Essential Functions

```typescript
// 1. Extract response
async function extractResponse(session: ReturnType<typeof query>): Promise<string> {
  let fullResponse = '';
  for await (const message of session) {
    if (message.type === 'assistant' && message.message?.content) {
      for (const block of message.message.content) {
        if (block.type === 'text') fullResponse += block.text;
      }
    }
  }
  return fullResponse;
}

// 2. Create tool
const myTool = tool(
  'tool_name',
  'description',
  z.object({ param: z.string() }),
  async ({ param }) => ({ result: '...' })
);

// 3. Query with tools
const session = query({
  prompt: 'Your prompt',
  options: {
    systemPrompt: 'System instructions',
    tools: [myTool]
  }
});
```

---

## Appendix A: Complete Working Examples

### Example 1: Simple Q&A Agent

```typescript
#!/usr/bin/env node
import { query } from '@anthropic-ai/claude-agent-sdk';

process.env.ANTHROPIC_BASE_URL = "https://api.minimax.io/anthropic";
process.env.ANTHROPIC_API_KEY = process.env.MINIMAX_TOKEN || '';

async function extractResponse(session: ReturnType<typeof query>): Promise<string> {
  let response = '';
  for await (const msg of session) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'text') response += block.text;
      }
    }
  }
  return response;
}

async function askQuestion(question: string): Promise<string> {
  const session = query({ prompt: question });
  return extractResponse(session);
}

// Usage
const answer = await askQuestion('What is the capital of France?');
console.log(answer);
```

### Example 2: Calculator Agent

```typescript
#!/usr/bin/env node
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

process.env.ANTHROPIC_BASE_URL = "https://api.minimax.io/anthropic";
process.env.ANTHROPIC_API_KEY = process.env.MINIMAX_TOKEN || '';

const calculator = tool(
  'calculator',
  'Performs basic arithmetic: add, subtract, multiply, divide',
  z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }),
  async ({ operation, a, b }) => {
    const ops = {
      add: a + b,
      subtract: a - b,
      multiply: a * b,
      divide: b !== 0 ? a / b : null
    };

    const result = ops[operation];
    if (result === null) {
      return { success: false, error: 'Division by zero' };
    }
    return { success: true, result };
  }
);

async function calculate(problem: string): Promise<string> {
  const session = query({
    prompt: problem,
    options: {
      systemPrompt: 'You are a math assistant. Use the calculator tool for all calculations.',
      tools: [calculator]
    }
  });

  let response = '';
  for await (const msg of session) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'text') response += block.text;
      }
    }
  }
  return response;
}

// Usage
console.log(await calculate('What is (15 + 27) * 3?'));
```

### Example 3: Multi-Tool Research Agent

```typescript
#!/usr/bin/env node
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import fs from 'fs/promises';

process.env.ANTHROPIC_BASE_URL = "https://api.minimax.io/anthropic";
process.env.ANTHROPIC_API_KEY = process.env.MINIMAX_TOKEN || '';

// File reader tool
const fileReader = tool(
  'read_file',
  'Read contents of a text file',
  z.object({ path: z.string() }),
  async ({ path }) => {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return { success: true, content, size: content.length };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
);

// Web search tool (mock for example)
const webSearch = tool(
  'web_search',
  'Search the web for information',
  z.object({ query: z.string(), maxResults: z.number().default(5) }),
  async ({ query, maxResults }) => {
    // In real implementation, call actual search API
    return {
      success: true,
      results: [
        { title: 'Example Result', url: 'https://example.com', snippet: 'Sample snippet...' }
      ]
    };
  }
);

// Note taker tool
const noteTaker = tool(
  'save_note',
  'Save information to a note file',
  z.object({ filename: z.string(), content: z.string() }),
  async ({ filename, content }) => {
    try {
      await fs.writeFile(filename, content, 'utf-8');
      return { success: true, path: filename };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
);

async function researchAgent(task: string): Promise<string> {
  const session = query({
    prompt: task,
    options: {
      systemPrompt: `You are a research assistant. You can:
        1. Read files using read_file
        2. Search the web using web_search
        3. Save findings using save_note

        Be thorough and systematic in your research.`,
      tools: [fileReader, webSearch, noteTaker]
    }
  });

  let response = '';
  for await (const msg of session) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'text') response += block.text;
      }
    }
  }
  return response;
}

// Usage
const result = await researchAgent('Research the history of artificial intelligence and save key findings to ai_history.md');
console.log(result);
```

---

## Appendix B: MiniMax-Specific Notes

### Known Behaviors

1. **Thinking Blocks**: MiniMax-M2 includes `thinking` content blocks in responses showing reasoning process
2. **Token Usage**: Check `message.usage` for token consumption tracking
3. **Model Capabilities**: MiniMax-M2 supports tool use, extended context, and reasoning

### Performance Characteristics

- **Average Response Time**: 2-5 seconds for simple queries
- **Tool Call Overhead**: +1-2 seconds per tool invocation
- **Context Window**: Check current MiniMax documentation
- **Rate Limits**: Consult MiniMax platform for current limits

### Differences from Standard Anthropic API

| Feature | Standard Anthropic | MiniMax Implementation |
|---------|-------------------|----------------------|
| Endpoint | api.anthropic.com | api.minimax.io/anthropic |
| Authentication | API Key | JWT Token |
| Models | claude-3-* | MiniMax-M2 |
| Thinking | Optional | Always included |
| Tool Use | Native | Native |

---

## Version History

- **v1.0** (2025-11-01): Initial comprehensive primer
  - Core SDK patterns
  - Tool development guide
  - Response handling
  - Testing strategies
  - Complete examples

---

## Additional Resources

### Official Documentation

- [Claude Agent SDK TypeScript](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Claude Agent SDK Python](https://github.com/anthropics/claude-agent-sdk-python)
- [MiniMax Platform](https://platform.minimax.io/)

### Internal References

- MiniMax Configuration: `~/.local/bin/ccmm`
- Test Suite: `./test-agent-minimax.ts`
- Simple Example: `./simple-test.ts`

### Quick Links

- Report SDK Issues: [GitHub Issues](https://github.com/anthropics/claude-agent-sdk-typescript/issues)
- MiniMax Support: [Platform Documentation](https://platform.minimax.io/docs)

---

**End of Primer** - Save this document for reference when building new agents with Claude Code + MiniMax + Claude Agent SDK
