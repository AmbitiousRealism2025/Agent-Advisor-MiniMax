/**
 * End-to-End Tests: Markdown Output Validation
 *
 * Ensures all generation tools emit Markdown with the required structure,
 * headers, code fences, metadata, and next steps sections.
 *
 * NOTE: Test parallelism is disabled for E2E tests (see vitest.config.ts:45-47)
 * to avoid race conditions in temp directories and streaming outputs.
 */

import { describe, it, expect } from 'vitest';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import {
  GenerateAgentCodeHandler,
  GenerateSystemPromptHandler,
  GenerateConfigFilesHandler
} from '../../src/lib/generation/tool-handlers.js';
import { createGenerateImplementationGuideTool } from '../../src/lib/export/tool-handler.js';
import {
  sampleDataAnalystRequirements,
  sampleContentCreatorRequirements,
  allSampleRequirements,
  expectedTemplateIds
} from '../fixtures/sample-requirements.js';
import {
  parseMarkdownDocument,
  validateMarkdownStructure,
  extractCodeFromMarkdown,
  validateCodeBlock
} from '../utils/markdown-validator.js';

const agentCodeHandler = new GenerateAgentCodeHandler();
const systemPromptHandler = new GenerateSystemPromptHandler();
const configFilesHandler = new GenerateConfigFilesHandler();
const implementationGuideTool = createGenerateImplementationGuideTool();
const classifier = new AgentClassifier();

function extractMarkdown(result: { content: Array<any> }): string {
  const textContent = result.content.find((item: any) => item.type === 'text');
  return textContent?.text ?? '';
}

describe('Markdown Output Validation E2E', () => {
  it('should generate code with proper Markdown structure', async () => {
    const codeResult = await agentCodeHandler.handle({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name,
      includeComments: true,
      includeErrorHandling: true,
      includeSampleUsage: true
    });

    const markdown = extractMarkdown(codeResult);
    expect(markdown).toContain('## Agent Code Generated');
    expect(markdown).toContain('### File: `src/index.ts`');
    expect(markdown).toContain('```typescript');
    expect(markdown).toContain('**To use**: Copy the above code');
    expect(markdown).toContain('## Code Metadata');
    expect(markdown).toContain('## Next Steps');

    const document = parseMarkdownDocument(markdown);
    const validation = validateMarkdownStructure(markdown);
    expect(validation.valid).toBe(true);
    expect(document.fileHeaders).toContain('src/index.ts');
    const tsBlock = document.codeBlocks.find(block => block.language === 'typescript');
    expect(tsBlock).toBeDefined();
  });

  it('should generate system prompt with proper Markdown structure', async () => {
    const promptResult = await systemPromptHandler.handle({
      templateId: 'content-creator',
      requirements: sampleContentCreatorRequirements,
      includeExamples: true,
      includeConstraints: true,
      verbosityLevel: 'detailed'
    });

    const markdown = extractMarkdown(promptResult);
    expect(markdown).toContain('## System Prompt Generated');
    expect(markdown).toContain('### File: `system-prompt.md`');
    expect(markdown).toContain('```markdown');
    expect(markdown).toContain('**To use**: Copy the above prompt');
    expect(markdown).toContain('## Prompt Metadata');
    expect(markdown).toContain('## Next Steps');

    const document = parseMarkdownDocument(markdown);
    const validation = validateMarkdownStructure(markdown);
    expect(validation.valid).toBe(true);
    const markdownBlocks = document.codeBlocks.filter(block => block.language === 'markdown');
    expect(markdownBlocks.length).toBeGreaterThan(0);
  });

  it('should generate config files with multiple code blocks', async () => {
    const recommendations = classifier.classify(sampleDataAnalystRequirements);
    const configResult = await configFilesHandler.handle({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name,
      requirements: sampleDataAnalystRequirements,
      recommendations,
      files: ['agent-config', 'env', 'package', 'tsconfig', 'readme', 'implementation-guide']
    });

    const markdown = extractMarkdown(configResult);
    expect(markdown).toContain('## Configuration Files Generated');
    expect(markdown).toContain('### File: `package.json`');
    expect(markdown).toContain('### File: `tsconfig.json`');
    expect(markdown).toContain('### File: `.env.example`');
    expect(markdown).toContain('```json');
    expect(markdown).toContain('```bash');
    expect(markdown).toContain('## Files Generated Summary');

    const document = parseMarkdownDocument(markdown);
    const validation = validateMarkdownStructure(markdown);
    expect(validation.valid).toBe(true);
    expect(document.fileHeaders).toEqual(expect.arrayContaining([
      'agent.config.json',
      '.env.example',
      'package.json',
      'tsconfig.json',
      'README.md',
      'IMPLEMENTATION.md'
    ]));
  });

  it('should generate implementation guide with proper structure', async () => {
    const recommendations = classifier.classify(sampleDataAnalystRequirements);
    const guideResult = await implementationGuideTool.handler({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name,
      requirements: sampleDataAnalystRequirements,
      recommendations,
      includeReadme: true,
      includeExamples: true
    }, {});

    const markdown = extractMarkdown(guideResult);
    expect(markdown).toContain('## Implementation Guide');
    expect(markdown).toContain('### File: `IMPLEMENTATION.md`');
    expect(markdown).toContain('```markdown');
    expect(markdown).toContain('**To use**: Copy the above content');
    expect(markdown).toContain('## Files Generated');
    expect(markdown).toContain('## Generation Metadata');
    expect(markdown).toContain('## Next Steps');

    const document = parseMarkdownDocument(markdown);
    const validation = validateMarkdownStructure(markdown);
    expect(validation.valid).toBe(true);
    expect(document.fileHeaders).toContain('IMPLEMENTATION.md');
    expect(document.fileHeaders).toContain('README.md');
  });

  it('should validate all code blocks are extractable', async () => {
    const recommendations = classifier.classify(sampleDataAnalystRequirements);
    const codeMarkdown = extractMarkdown(await agentCodeHandler.handle({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name,
      includeComments: true,
      includeErrorHandling: true,
      includeSampleUsage: true
    }));
    const promptMarkdown = extractMarkdown(await systemPromptHandler.handle({
      templateId: 'data-analyst',
      requirements: sampleDataAnalystRequirements,
      includeExamples: true,
      includeConstraints: true,
      verbosityLevel: 'standard'
    }));
    const configMarkdown = extractMarkdown(await configFilesHandler.handle({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name,
      requirements: sampleDataAnalystRequirements,
      recommendations,
      files: ['agent-config', 'env', 'package', 'tsconfig', 'readme', 'implementation-guide']
    }));
    const guideMarkdown = extractMarkdown(await implementationGuideTool.handler({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name,
      requirements: sampleDataAnalystRequirements,
      recommendations,
      includeReadme: true,
      includeExamples: true
    }, {}));

    const documents = [codeMarkdown, promptMarkdown, configMarkdown, guideMarkdown];

    documents.forEach(markdown => {
      const document = parseMarkdownDocument(markdown);
      expect(document.codeBlocks.length).toBeGreaterThan(0);
      document.codeBlocks.forEach(block => {
        const validation = validateCodeBlock(block);
        expect(validation.valid).toBe(true);
      });
    });
  });

  it('should maintain consistent formatting across all templates', async () => {
    const headerSets = new Set<string>();

    for (let index = 0; index < allSampleRequirements.length; index++) {
      const templateId = expectedTemplateIds[index];
      const requirements = allSampleRequirements[index];

      const codeMarkdown = extractMarkdown(await agentCodeHandler.handle({
        templateId,
        agentName: requirements.name,
        includeComments: true,
        includeErrorHandling: true,
        includeSampleUsage: true
      }));
      const promptMarkdown = extractMarkdown(await systemPromptHandler.handle({
        templateId,
        requirements,
        includeExamples: true,
        includeConstraints: true,
        verbosityLevel: 'standard'
      }));

      const codeValidation = validateMarkdownStructure(codeMarkdown);
      const promptValidation = validateMarkdownStructure(promptMarkdown);
      expect(codeValidation.valid).toBe(true);
      expect(promptValidation.valid).toBe(true);

      const codeHeaders = parseMarkdownDocument(codeMarkdown).fileHeaders.join('|');
      const promptHeaders = parseMarkdownDocument(promptMarkdown).fileHeaders.join('|');
      headerSets.add(`${codeHeaders}::${promptHeaders}`);
    }

    expect(headerSets.size).toBe(1);
  });

});
