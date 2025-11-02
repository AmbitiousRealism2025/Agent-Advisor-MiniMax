/**
 * Unit Tests: Markdown Validator Edge Cases
 *
 * Tests edge cases and boundary conditions for markdown-validator.ts utility functions.
 * These tests ensure robust handling of malformed, unusual, or edge-case Markdown structures.
 */

import { describe, it, expect } from 'vitest';
import {
  parseMarkdownDocument,
  validateMarkdownStructure,
  extractCodeFromMarkdown,
  extractFileMapping,
  validateCodeBlock,
  type CodeBlock
} from '../utils/markdown-validator.js';

describe('Markdown Validator Edge Cases', () => {
  describe('parseMarkdownDocument() - Edge Cases', () => {
    it('should handle unterminated code block gracefully', () => {
      const markdown = `
## Test Document

### File: \`test.ts\`

\`\`\`typescript
const x = 42;
// Missing closing fence
`;

      const result = parseMarkdownDocument(markdown);

      // Should not find the unterminated code block
      expect(result.codeBlocks).toHaveLength(0);
      expect(result.fileHeaders).toContain('test.ts');
    });

    it('should handle nested backticks within code block content', () => {
      const markdown = `
## Code with Backticks

### File: \`example.md\`

\`\`\`markdown
Here's some code with \`inline backticks\` inside.
And a code fence example:
\\\`\\\`\\\`javascript
console.log('nested');
\\\`\\\`\\\`
\`\`\`

**To use**: Copy the above content.
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].content).toContain('`inline backticks`');
      expect(result.codeBlocks[0].content).toContain('\\`\\`\\`javascript');
    });

    it('should handle empty code block', () => {
      const markdown = `
### File: \`empty.txt\`

\`\`\`text
\`\`\`

**To use**: Copy the above content.
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].content).toBe('');
      expect(result.codeBlocks[0].language).toBe('text');
    });

    it('should handle code block with whitespace-only content', () => {
      const markdown = `
### File: \`whitespace.txt\`

\`\`\`text


\`\`\`

**To use**: Copy the above content.
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].content.trim()).toBe('');
    });

    it('should handle multiple code blocks in succession', () => {
      const markdown = `
### File: \`first.ts\`

\`\`\`typescript
const a = 1;
\`\`\`

**To use**: Copy first.

### File: \`second.ts\`

\`\`\`typescript
const b = 2;
\`\`\`

**To use**: Copy second.
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.codeBlocks).toHaveLength(2);
      expect(result.fileHeaders).toHaveLength(2);
      expect(result.copyInstructions).toHaveLength(2);
    });

    it('should normalize language aliases correctly', () => {
      const markdown = `
\`\`\`ts
const ts = true;
\`\`\`

\`\`\`js
const js = true;
\`\`\`

\`\`\`sh
echo "shell"
\`\`\`

\`\`\`yml
key: value
\`\`\`
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.codeBlocks[0].language).toBe('typescript');
      expect(result.codeBlocks[1].language).toBe('javascript');
      expect(result.codeBlocks[2].language).toBe('bash');
      expect(result.codeBlocks[3].language).toBe('yaml');
    });

    it('should handle language tag with extra whitespace', () => {
      const markdown = `
\`\`\`   typescript
const x = 1;
\`\`\`
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].language).toBe('typescript');
    });

    it('should extract metadata from bullet points', () => {
      const markdown = `
## Metadata

- **Template**: data-analyst
- **Agent Name**: Test Agent
- **Lines of Code**: 250
- **Generated At**: 2025-11-02T16:30:00.000Z
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.metadata['Template']).toBe('data-analyst');
      expect(result.metadata['Agent Name']).toBe('Test Agent');
      expect(result.metadata['Lines of Code']).toBe('250');
      expect(result.metadata['Generated At']).toBe('2025-11-02T16:30:00.000Z');
    });

    it('should extract next steps from list items', () => {
      const markdown = `
## Next Steps

- Review the generated code
- Install dependencies
- Configure environment variables
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.nextSteps).toHaveLength(3);
      expect(result.nextSteps[0]).toBe('Review the generated code');
      expect(result.nextSteps[1]).toBe('Install dependencies');
      expect(result.nextSteps[2]).toBe('Configure environment variables');
    });

    it('should handle file header with special characters in filename', () => {
      const markdown = `
### File: \`.env.example\`

\`\`\`bash
KEY=value
\`\`\`

### File: \`package-lock.json\`

\`\`\`json
{}
\`\`\`
`;

      const result = parseMarkdownDocument(markdown);

      expect(result.fileHeaders).toContain('.env.example');
      expect(result.fileHeaders).toContain('package-lock.json');
    });

    it('should handle copy instructions with varied formatting', () => {
      const markdown = `
\`\`\`typescript
const x = 1;
\`\`\`

**To use**: Copy the above code to \`src/index.ts\`.

\`\`\`json
{}
\`\`\`

**To Use**: Different capitalization here.

\`\`\`bash
echo "test"
\`\`\`

**TO USE**: All caps version.
`;

      const result = parseMarkdownDocument(markdown);

      // Case-insensitive matching
      expect(result.copyInstructions).toHaveLength(3);
    });

    it('should handle code block inside Next Steps section', () => {
      const markdown = `
## Next Steps

1. Run this command:

\`\`\`bash
npm install
\`\`\`

2. Configure environment

- Another step here
`;

      const result = parseMarkdownDocument(markdown);

      // Should still parse code block
      expect(result.codeBlocks).toHaveLength(1);
      // Should only extract text list items as next steps, not code blocks
      expect(result.nextSteps).toHaveLength(1);
      expect(result.nextSteps[0]).toBe('Another step here');
    });
  });

  describe('validateMarkdownStructure() - Edge Cases', () => {
    it('should reject Markdown without any section headers', () => {
      const markdown = `
Some text here

\`\`\`typescript
const x = 1;
\`\`\`
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Markdown is missing required section headers (## heading).');
    });

    it('should reject code block without language tag', () => {
      const markdown = `
## Test

### File: \`test.ts\`

\`\`\`
const x = 1;
\`\`\`

**To use**: Copy the above code.
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing a language tag'))).toBe(true);
    });

    it('should reject code block without file header', () => {
      const markdown = `
## Test

\`\`\`typescript
const x = 1;
\`\`\`

**To use**: Copy the above code.
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not have a preceding file header'))).toBe(true);
    });

    it('should reject code block without copy instructions', () => {
      const markdown = `
## Test

### File: \`test.ts\`

\`\`\`typescript
const x = 1;
\`\`\`

Some other text, but no copy instructions.
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Copy instructions missing'))).toBe(true);
    });

    it('should accept valid Markdown with all required elements', () => {
      const markdown = `
## Agent Code Generated

### File: \`src/index.ts\`

\`\`\`typescript
const agent = "test";
\`\`\`

**To use**: Copy the above code to \`src/index.ts\`.

## Next Steps

1. Install dependencies
2. Run the agent
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn when no copy instructions found in entire document', () => {
      const markdown = `
## Test Document

Some text without code blocks or copy instructions.

## Another Section

More text here.
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.warnings.some(w => w.includes('No copy instructions found'))).toBe(true);
    });

    it('should handle multiple code blocks with proper validation', () => {
      const markdown = `
## Files Generated

### File: \`package.json\`

\`\`\`json
{"name": "test"}
\`\`\`

**To use**: Copy to package.json.

### File: \`tsconfig.json\`

\`\`\`json
{"compilerOptions": {}}
\`\`\`

**To use**: Copy to tsconfig.json.
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle file header followed immediately by code block', () => {
      const markdown = `
## Test

### File: \`test.ts\`
\`\`\`typescript
const x = 1;
\`\`\`

**To use**: Copy the code.
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.valid).toBe(true);
    });

    it('should detect copy instruction immediately after closing fence', () => {
      const markdown = `
## Test

### File: \`test.ts\`

\`\`\`typescript
const x = 1;
\`\`\`
**To use**: No blank line before this.
`;

      const result = validateMarkdownStructure(markdown);

      expect(result.valid).toBe(true);
    });
  });

  describe('extractCodeFromMarkdown() - Edge Cases', () => {
    it('should return empty array when no code blocks present', () => {
      const markdown = `
## No Code Here

Just plain text.
`;

      const result = extractCodeFromMarkdown(markdown);

      expect(result).toHaveLength(0);
    });

    it('should extract all code blocks when no language filter', () => {
      const markdown = `
\`\`\`typescript
const ts = 1;
\`\`\`

\`\`\`javascript
const js = 2;
\`\`\`

\`\`\`python
py = 3
\`\`\`
`;

      const result = extractCodeFromMarkdown(markdown);

      expect(result).toHaveLength(3);
      expect(result[0]).toContain('const ts');
      expect(result[1]).toContain('const js');
      expect(result[2]).toContain('py = 3');
    });

    it('should filter by language case-insensitively', () => {
      const markdown = `
\`\`\`TypeScript
const ts1 = 1;
\`\`\`

\`\`\`typescript
const ts2 = 2;
\`\`\`

\`\`\`TYPESCRIPT
const ts3 = 3;
\`\`\`

\`\`\`javascript
const js = 4;
\`\`\`
`;

      const result = extractCodeFromMarkdown(markdown, 'typescript');

      expect(result).toHaveLength(3);
      expect(result[0]).toContain('ts1');
      expect(result[1]).toContain('ts2');
      expect(result[2]).toContain('ts3');
    });

    it('should handle language aliases when filtering', () => {
      const markdown = `
\`\`\`ts
const x = 1;
\`\`\`

\`\`\`typescript
const y = 2;
\`\`\`
`;

      // Both should be normalized to 'typescript'
      const result = extractCodeFromMarkdown(markdown, 'typescript');

      expect(result).toHaveLength(2);
    });

    it('should return empty array when language filter matches nothing', () => {
      const markdown = `
\`\`\`typescript
const ts = 1;
\`\`\`

\`\`\`javascript
const js = 2;
\`\`\`
`;

      const result = extractCodeFromMarkdown(markdown, 'python');

      expect(result).toHaveLength(0);
    });

    it('should preserve whitespace and newlines in extracted code', () => {
      const markdown = `
\`\`\`typescript
function test() {
  return {
    key: "value"
  };
}
\`\`\`
`;

      const result = extractCodeFromMarkdown(markdown);

      expect(result[0]).toContain('  return {');
      expect(result[0]).toContain('    key: "value"');
      expect(result[0]).toContain('  };');
    });
  });

  describe('extractFileMapping() - Edge Cases', () => {
    it('should return empty map when no file headers', () => {
      const markdown = `
## Test

\`\`\`typescript
const x = 1;
\`\`\`
`;

      const result = extractFileMapping(markdown);

      expect(result.size).toBe(0);
    });

    it('should return empty map when file headers have no following code blocks', () => {
      const markdown = `
### File: \`test1.ts\`

Some text but no code block.

### File: \`test2.ts\`

More text, still no code.
`;

      const result = extractFileMapping(markdown);

      expect(result.size).toBe(0);
    });

    it('should map first code block after each file header', () => {
      const markdown = `
### File: \`first.ts\`

\`\`\`typescript
const first = 1;
\`\`\`

\`\`\`typescript
const alsofirst = 2;
\`\`\`

### File: \`second.ts\`

\`\`\`typescript
const second = 3;
\`\`\`
`;

      const result = extractFileMapping(markdown);

      expect(result.size).toBe(2);
      expect(result.get('first.ts')).toContain('const first = 1');
      expect(result.get('first.ts')).not.toContain('alsofirst');
      expect(result.get('second.ts')).toContain('const second = 3');
    });

    it('should handle file headers with paths', () => {
      const markdown = `
### File: \`src/lib/index.ts\`

\`\`\`typescript
export const x = 1;
\`\`\`

### File: \`tests/unit/test.ts\`

\`\`\`typescript
import { x } from '../../src/lib/index.js';
\`\`\`
`;

      const result = extractFileMapping(markdown);

      expect(result.size).toBe(2);
      expect(result.has('src/lib/index.ts')).toBe(true);
      expect(result.has('tests/unit/test.ts')).toBe(true);
    });

    it('should handle file headers at end of document', () => {
      const markdown = `
### File: \`early.ts\`

\`\`\`typescript
const early = 1;
\`\`\`

### File: \`late.ts\`

\`\`\`typescript
const late = 2;
\`\`\`
`;

      const result = extractFileMapping(markdown);

      expect(result.size).toBe(2);
      expect(result.get('late.ts')).toContain('const late = 2');
    });

    it('should ignore code blocks before any file header', () => {
      const markdown = `
\`\`\`typescript
const orphan = 1;
\`\`\`

### File: \`proper.ts\`

\`\`\`typescript
const proper = 2;
\`\`\`
`;

      const result = extractFileMapping(markdown);

      expect(result.size).toBe(1);
      expect(result.has('proper.ts')).toBe(true);
      expect(result.get('proper.ts')).toContain('const proper = 2');
    });
  });

  describe('validateCodeBlock() - Edge Cases', () => {
    it('should reject code block without language', () => {
      const block: CodeBlock = {
        language: '',
        content: 'const x = 1;',
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(block);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Code block is missing a language tag.');
    });

    it('should reject code block with empty content', () => {
      const block: CodeBlock = {
        language: 'typescript',
        content: '   ',
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(block);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Code block content is empty.');
    });

    it('should validate JSON code blocks', () => {
      const validBlock: CodeBlock = {
        language: 'json',
        content: '{"key": "value", "number": 42}',
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(validBlock);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid JSON code blocks', () => {
      const invalidBlock: CodeBlock = {
        language: 'json',
        content: '{key: "value"}', // Missing quotes around key
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(invalidBlock);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid JSON'))).toBe(true);
    });

    it('should validate TypeScript code blocks for syntax', () => {
      const validBlock: CodeBlock = {
        language: 'typescript',
        content: 'const x: number = 42;\nconst y: string = "hello";',
        startLine: 1,
        endLine: 2
      };

      const result = validateCodeBlock(validBlock);

      // Syntax validation should pass (even though module resolution would fail)
      expect(result.valid).toBe(true);
    });

    it('should reject TypeScript with syntax errors', () => {
      const invalidBlock: CodeBlock = {
        language: 'typescript',
        content: 'const x = ;', // Missing value
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(invalidBlock);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle JSONC language variant', () => {
      const block: CodeBlock = {
        language: 'jsonc',
        content: '{"key": "value"}',
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(block);

      expect(result.valid).toBe(true);
    });

    it('should not validate non-JSON/TypeScript languages', () => {
      const bashBlock: CodeBlock = {
        language: 'bash',
        content: 'echo "hello"',
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(bashBlock);

      // Should pass without specific validation
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle TypeScript alias "ts"', () => {
      const block: CodeBlock = {
        language: 'ts',
        content: 'const x: number = 42;',
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(block);

      expect(result.valid).toBe(true);
    });

    it('should handle TypeScriptReact for TSX files', () => {
      const block: CodeBlock = {
        language: 'typescriptreact',
        content: 'const Component = () => <div>Hello</div>;',
        startLine: 1,
        endLine: 1
      };

      const result = validateCodeBlock(block);

      // Should attempt TypeScript validation
      expect(result.errors).toBeDefined();
    });
  });
});
