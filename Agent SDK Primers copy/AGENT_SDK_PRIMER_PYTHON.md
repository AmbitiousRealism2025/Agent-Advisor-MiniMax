# Claude Agent SDK with MiniMax - Python Guide

> **Companion to**: AGENT_SDK_PRIMER_TYPESCRIPT.md
> **Focus**: Python-specific patterns and differences
> **Last Updated**: 2025-11-01

---

## Key Differences: Python vs TypeScript

| Aspect | Python | TypeScript |
|--------|--------|------------|
| **Async** | `async`/`await` + `asyncio` | `async`/`await` native |
| **Iteration** | `async for` | `for await` |
| **Tool Definition** | `@tool` decorator | `tool()` function |
| **Tool Schema** | `{"param": type}` dict | Zod schema |
| **Message Types** | Class instances | Object with `.type` |
| **Response Extraction** | `isinstance(msg, AssistantMessage)` | `message.type === 'assistant'` |
| **CLI Path** | Required in options | Auto-detected or in options |

---

## Quick Start (Python)

### Minimal Setup

```python
import os
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock

# Configure MiniMax
os.environ["ANTHROPIC_BASE_URL"] = "https://api.minimax.io/anthropic"
os.environ["ANTHROPIC_API_KEY"] = "your_minimax_jwt_token"

async def simple_query():
    # Must specify CLI path
    options = ClaudeAgentOptions(
        cli_path="/Users/yourusername/.claude/local/claude"
    )

    session = query(prompt="Hello!", options=options)

    response = ""
    async for message in session:
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    response += block.text

    print(response)

asyncio.run(simple_query())
```

---

## Core Patterns (Python)

### Pattern 1: Response Extraction Helper

```python
from claude_agent_sdk import AssistantMessage, TextBlock

async def extract_response(session) -> str:
    """Extract text from query session."""
    full_response = ""

    async for message in session:
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    full_response += block.text

    return full_response
```

### Pattern 2: Basic Query

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def ask_question(question: str) -> str:
    options = ClaudeAgentOptions(
        cli_path="/Users/yourusername/.claude/local/claude"
    )

    session = query(prompt=question, options=options)
    return await extract_response(session)

# Usage
answer = asyncio.run(ask_question("What is 2+2?"))
```

### Pattern 3: Tool Definition

```python
from claude_agent_sdk import tool

@tool(
    "calculator",
    "Performs arithmetic operations",
    {"operation": str, "a": float, "b": float}
)
async def calculator_tool(args):
    """Tool handler receives args dict."""
    op = args["operation"]
    a = args["a"]
    b = args["b"]

    if op == "add":
        result = a + b
    elif op == "subtract":
        result = a - b
    elif op == "multiply":
        result = a * b
    elif op == "divide":
        result = a / b if b != 0 else None
    else:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: Unknown operation '{op}'"
            }]
        }

    return {
        "content": [{
            "type": "text",
            "text": f"Result: {result}"
        }]
    }
```

### Pattern 4: Query with Tools

```python
from claude_agent_sdk import query, create_sdk_mcp_server, ClaudeAgentOptions

async def query_with_tools(prompt: str):
    # Create the tool
    calculator = calculator_tool  # From Pattern 3

    # Create MCP server
    calc_server = create_sdk_mcp_server(
        name="calculator",
        tools=[calculator]
    )

    # Configure options with tools
    options = ClaudeAgentOptions(
        cli_path="/Users/yourusername/.claude/local/claude",
        system_prompt="You are a math assistant. Use the calculator tool.",
        mcp_servers={"calc": calc_server},
        allowed_tools=["calculator"]
    )

    session = query(prompt=prompt, options=options)
    return await extract_response(session)

# Usage
result = asyncio.run(query_with_tools("What is 15 * 27?"))
```

---

## Tool Development (Python)

### Tool Structure

The `@tool` decorator has this signature:

```python
def tool(
    name: str,           # Tool identifier
    description: str,    # What the tool does
    input_schema: dict   # Parameter schema
) -> Callable
```

### Input Schema Format

```python
# Simple types
{"name": str, "age": int, "score": float}

# With defaults (not directly supported - handle in function)
{"query": str, "max_results": int}  # Use args.get("max_results", 10)

# Complex nested (use dict for JSON schema)
{
    "user": {"type": "object", "properties": {"name": str, "age": int}},
    "preferences": {"type": "array", "items": str}
}
```

### Tool Return Format

**MUST** return a dict with this structure:

```python
{
    "content": [
        {"type": "text", "text": "Your response here"},
        # Can have multiple content blocks
    ]
}

# For errors
{
    "content": [
        {"type": "text", "text": "Error: Something went wrong"},
    ],
    "isError": True  # Optional
}
```

### Complete Tool Example

```python
@tool(
    "database_query",
    "Query the database with SQL",
    {"sql": str, "limit": int}
)
async def db_query_tool(args):
    sql = args["sql"]
    limit = args.get("limit", 100)  # Default handling

    try:
        # Your database logic here
        results = await execute_sql(sql, limit)

        return {
            "content": [{
                "type": "text",
                "text": f"Found {len(results)} results:\n{format_results(results)}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Database error: {str(e)}"
            }],
            "isError": True
        }
```

---

## Message Types (Python)

### Message Class Hierarchy

```python
from claude_agent_sdk import (
    AssistantMessage,  # AI responses
    UserMessage,       # User inputs
    SystemMessage,     # System info
    ResultMessage,     # Final results
    TextBlock,         # Text content
    ThinkingBlock,     # Reasoning (MiniMax-M2)
    ToolUseBlock,      # Tool calls
    ToolResultBlock    # Tool results
)
```

### Message Inspection

```python
async for message in session:
    # Check message type
    if isinstance(message, AssistantMessage):
        # Access content
        for block in message.content:
            if isinstance(block, TextBlock):
                print(f"Text: {block.text}")
            elif isinstance(block, ThinkingBlock):
                print(f"Thinking: {block.thinking}")
            elif isinstance(block, ToolUseBlock):
                print(f"Tool: {block.name}, Input: {block.input}")

    elif isinstance(message, ResultMessage):
        print(f"Duration: {message.duration_ms}ms")
        print(f"Cost: ${message.total_cost_usd}")
        print(f"Turns: {message.num_turns}")
```

### Advanced Response Handler

```python
from dataclasses import dataclass
from typing import List

@dataclass
class ParsedResponse:
    text: str
    thinking: str
    tool_uses: List[dict]
    metadata: dict

async def parse_full_response(session) -> ParsedResponse:
    result = ParsedResponse(
        text="",
        thinking="",
        tool_uses=[],
        metadata={}
    )

    async for message in session:
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    result.text += block.text
                elif isinstance(block, ThinkingBlock):
                    result.thinking += block.thinking
                elif isinstance(block, ToolUseBlock):
                    result.tool_uses.append({
                        "tool": block.name,
                        "input": block.input
                    })

        elif isinstance(message, ResultMessage):
            result.metadata = {
                "duration_ms": message.duration_ms,
                "cost_usd": message.total_cost_usd,
                "turns": message.num_turns
            }

    return result
```

---

## CLI Path Configuration

### Finding Claude CLI

```bash
# Method 1: Check alias
which claude
# Output: claude: aliased to /Users/username/.claude/local/claude

# Method 2: Search filesystem
find ~/.claude -name "claude" -type f

# Method 3: Check common locations
ls -la ~/.claude/local/claude
ls -la /usr/local/bin/claude
```

### Configuration Methods

```python
# Method 1: In ClaudeAgentOptions
options = ClaudeAgentOptions(
    cli_path="/Users/username/.claude/local/claude"
)

# Method 2: Environment variable
import os
os.environ["CLAUDE_CLI_PATH"] = "/Users/username/.claude/local/claude"

# Method 3: System PATH
# Add to ~/.zshrc or ~/.bashrc:
# export PATH="$HOME/.claude/local:$PATH"
```

---

## Common Python Pitfalls

### ❌ Pitfall 1: Forgetting `async`/`await`

```python
# ❌ WRONG - Synchronous iteration
for message in session:
    print(message)  # TypeError: 'async_generator' not iterable

# ✅ CORRECT - Async iteration
async for message in session:
    print(message)
```

### ❌ Pitfall 2: Wrong Tool Return Format

```python
# ❌ WRONG - Returns plain value
@tool("add", "Add numbers", {"a": float, "b": float})
async def add_tool(args):
    return args["a"] + args["b"]  # Wrong!

# ✅ CORRECT - Returns proper structure
@tool("add", "Add numbers", {"a": float, "b": float})
async def add_tool(args):
    result = args["a"] + args["b"]
    return {"content": [{"type": "text", "text": f"Result: {result}"}]}
```

### ❌ Pitfall 3: Not Handling CLI Path

```python
# ❌ WRONG - Missing CLI path
session = query(prompt="Hello")  # CLINotFoundError

# ✅ CORRECT - Specify CLI path
options = ClaudeAgentOptions(cli_path="/path/to/claude")
session = query(prompt="Hello", options=options)
```

### ❌ Pitfall 4: Wrong Message Type Check

```python
# ❌ WRONG - Checking string type
async for message in session:
    if message.type == "assistant":  # AttributeError: no 'type'
        print(message.content)

# ✅ CORRECT - Using isinstance
async for message in session:
    if isinstance(message, AssistantMessage):
        print(message.content)
```

### ❌ Pitfall 5: Missing `asyncio.run()`

```python
# ❌ WRONG - Calling async function directly
result = my_async_function()  # Returns coroutine object

# ✅ CORRECT - Using asyncio.run()
result = asyncio.run(my_async_function())
```

---

## Testing (Python)

### Basic Test Structure

```python
import asyncio
import pytest
from claude_agent_sdk import query, ClaudeAgentOptions

@pytest.mark.asyncio
async def test_basic_query():
    """Test basic API connectivity."""
    options = ClaudeAgentOptions(
        cli_path="/Users/username/.claude/local/claude"
    )

    session = query(prompt="Say hello", options=options)
    response = await extract_response(session)

    assert response
    assert len(response) > 0
```

### Tool Testing

```python
@pytest.mark.asyncio
async def test_calculator_tool():
    """Test calculator tool functionality."""
    # Call tool directly for unit testing
    result = await calculator_tool({
        "operation": "add",
        "a": 5,
        "b": 3
    })

    assert result["content"][0]["text"] == "Result: 8"

@pytest.mark.asyncio
async def test_calculator_integration():
    """Test calculator through agent."""
    calc_server = create_sdk_mcp_server("calc", tools=[calculator_tool])

    options = ClaudeAgentOptions(
        cli_path="/Users/username/.claude/local/claude",
        mcp_servers={"calc": calc_server},
        allowed_tools=["calculator"]
    )

    session = query(prompt="What is 10 + 5?", options=options)
    response = await extract_response(session)

    assert "15" in response
```

### Test Configuration

```python
# conftest.py
import pytest
import os

@pytest.fixture
def claude_options():
    """Reusable options for tests."""
    return ClaudeAgentOptions(
        cli_path="/Users/username/.claude/local/claude"
    )

@pytest.fixture(autouse=True)
def setup_env():
    """Set up environment for all tests."""
    os.environ["ANTHROPIC_BASE_URL"] = "https://api.minimax.io/anthropic"
    os.environ["ANTHROPIC_API_KEY"] = os.getenv("MINIMAX_TOKEN")
```

---

## Complete Working Example

```python
#!/usr/bin/env python3
"""Complete agent example with tools."""

import os
import asyncio
from claude_agent_sdk import (
    query,
    tool,
    create_sdk_mcp_server,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock
)

# Configuration
os.environ["ANTHROPIC_BASE_URL"] = "https://api.minimax.io/anthropic"
os.environ["ANTHROPIC_API_KEY"] = os.getenv("MINIMAX_TOKEN")

CLI_PATH = "/Users/yourusername/.claude/local/claude"

# Tool definitions
@tool("add", "Add two numbers", {"a": float, "b": float})
async def add_tool(args):
    result = args["a"] + args["b"]
    return {"content": [{"type": "text", "text": f"Result: {result}"}]}

@tool("multiply", "Multiply two numbers", {"a": float, "b": float})
async def multiply_tool(args):
    result = args["a"] * args["b"]
    return {"content": [{"type": "text", "text": f"Result: {result}"}]}

# Response extractor
async def extract_response(session) -> str:
    response = ""
    async for message in session:
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    response += block.text
    return response

# Main agent
async def math_agent(problem: str) -> str:
    """Agent that solves math problems."""
    # Create MCP server
    math_server = create_sdk_mcp_server(
        name="math",
        tools=[add_tool, multiply_tool]
    )

    # Configure
    options = ClaudeAgentOptions(
        cli_path=CLI_PATH,
        system_prompt="You are a math assistant. Use the tools for calculations.",
        mcp_servers={"math": math_server},
        allowed_tools=["add", "multiply"]
    )

    # Query
    session = query(prompt=problem, options=options)
    return await extract_response(session)

# Run
async def main():
    result = await math_agent("What is (5 + 3) * 4?")
    print(f"Answer: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Debugging Tips

### Enable Debug Output

```python
import logging

logging.basicConfig(level=logging.DEBUG)

# OR set in options
options = ClaudeAgentOptions(
    cli_path=CLI_PATH,
    debug_stderr=True  # Print subprocess stderr
)
```

### Inspect Messages

```python
async for message in session:
    print(f"\n=== {type(message).__name__} ===")
    print(f"Attributes: {[a for a in dir(message) if not a.startswith('_')]}")

    if hasattr(message, 'content'):
        print(f"Content: {message.content}")
```

### Test CLI Path

```python
from pathlib import Path

cli_path = Path("/Users/username/.claude/local/claude")

assert cli_path.exists(), f"CLI not found at {cli_path}"
assert cli_path.is_file(), f"CLI path is not a file: {cli_path}"
assert os.access(cli_path, os.X_OK), f"CLI not executable: {cli_path}"

print(f"✅ CLI validated: {cli_path}")
```

---

## Performance Tips

### Batch Processing

```python
async def process_batch(prompts: list[str]) -> list[str]:
    """Process multiple prompts concurrently."""
    tasks = [math_agent(prompt) for prompt in prompts]
    return await asyncio.gather(*tasks)

# Usage
prompts = ["What is 2+2?", "What is 5*5?", "What is 10+20?"]
results = asyncio.run(process_batch(prompts))
```

### Resource Limits

```python
from claude_agent_sdk import ClaudeAgentOptions

options = ClaudeAgentOptions(
    cli_path=CLI_PATH,
    max_turns=10,              # Limit conversation turns
    max_budget_usd=0.50,       # Cost limit
    max_thinking_tokens=2000   # Thinking token limit (MiniMax)
)
```

### Connection Pooling

For high-throughput applications, reuse the CLI process:

```python
# Note: The Python SDK manages this internally
# Just create one options object and reuse it

SHARED_OPTIONS = ClaudeAgentOptions(cli_path=CLI_PATH)

async def query_with_shared_options(prompt: str) -> str:
    session = query(prompt=prompt, options=SHARED_OPTIONS)
    return await extract_response(session)
```

---

## Quick Reference

### Essential Imports

```python
import asyncio
from claude_agent_sdk import (
    query,
    tool,
    create_sdk_mcp_server,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock
)
```

### Essential Pattern

```python
# 1. Configure
os.environ["ANTHROPIC_BASE_URL"] = "https://api.minimax.io/anthropic"
os.environ["ANTHROPIC_API_KEY"] = "token"

# 2. Define tools
@tool("name", "description", {"param": type})
async def my_tool(args):
    return {"content": [{"type": "text", "text": "result"}]}

# 3. Create MCP server
server = create_sdk_mcp_server("server_name", tools=[my_tool])

# 4. Configure options
options = ClaudeAgentOptions(
    cli_path="/path/to/claude",
    mcp_servers={"name": server},
    allowed_tools=["name"]
)

# 5. Query
session = query(prompt="...", options=options)

# 6. Extract response
async for msg in session:
    if isinstance(msg, AssistantMessage):
        for block in msg.content:
            if isinstance(block, TextBlock):
                print(block.text)
```

---

## Differences from TypeScript SDK

| Feature | Python | TypeScript |
|---------|--------|------------|
| Tool definition | `@tool` decorator | `tool()` function call |
| Async syntax | `async for` | `for await` |
| Type checking | Runtime (optional typing) | Compile-time (TypeScript) |
| Schema | Dict with types | Zod schema |
| Message check | `isinstance(msg, Type)` | `msg.type === 'type'` |
| Response content | `msg.content` directly | `msg.message.content` |
| CLI requirement | Must specify path | Auto-detected |
| Module system | Standard Python imports | ES modules |

---

**End of Python Guide** - Use alongside AGENT_SDK_PRIMER_TYPESCRIPT.md for complete reference
