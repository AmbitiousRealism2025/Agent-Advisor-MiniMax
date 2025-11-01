/**
 * Unit Tests - Code Generator
 *
 * Tests TypeScript code generation for all templates.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CodeGenerator } from '../../../src/lib/generation/code-generator.js';
import { ALL_TEMPLATES } from '../../../src/templates/index.js';
import { extractToolNames, validateTypeScriptCode } from '../../utils/test-helpers.js';

describe('CodeGenerator', () => {
  let generator: CodeGenerator;

  beforeEach(() => {
    generator = new CodeGenerator();
  });

  it('should generate full code for data analyst template', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent'
    });

    expect(code).toBeDefined();
    expect(code.length).toBeGreaterThan(100);
    expect(code).toContain('@anthropic-ai/claude-agent-sdk');
    expect(code).toContain('zod');
  });

  it('should generate full code for all 5 templates', () => {
    const toCamelCase = (value: string) => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

    ALL_TEMPLATES.forEach(template => {
      const code = generator.generateFullCode({
        templateId: template.id,
        agentName: 'TestAgent'
      });

      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThan(100);

      const toolNames = extractToolNames(code);
      const expectedToolNames = template.defaultTools.map(tool => tool.name);
      expectedToolNames.forEach(toolName => {
        const camelName = toCamelCase(toolName);
        const candidates = [toolName, `${camelName}Tool`];
        expect(toolNames.some(name => candidates.includes(name))).toBe(true);

        const exportPattern = new RegExp(`export\\s+const\\s+${camelName}Tool\\s*=`);
        expect(exportPattern.test(code)).toBe(true);
      });

      const schemaCount = (code.match(/z\.object\(\{/g) ?? []).length;
      expect(schemaCount).toBe(template.defaultTools.length);
    });
  });

  it('should include comments when includeComments is true', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent',
      includeComments: true
    });

    expect(code).toContain('/**');
    expect(code).toContain('Tool Implementations');
  });

  it('should exclude comments when includeComments is false', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent',
      includeComments: false
    });

    expect(code).not.toContain('/**');
  });

  it('should include error handling when includeErrorHandling is true', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent',
      includeErrorHandling: true
    });

    expect(code).toContain('try {');
    expect(code).toContain('catch');
  });

  it('should include sample usage when includeSampleUsage is true', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent',
      includeSampleUsage: true
    });

    expect(code).toContain('main()');
  });

  it('should generate tool implementations with Zod schemas', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent'
    });

    expect(code).toContain('z.object({');
    expect(code).toContain('export const');
  });

  it('should generate agent initialization with correct config', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent'
    });

    expect(code).toContain('getMinimaxConfig()');
    expect(code).toContain('model: config.model');
    expect(code).toContain('apiKey: config.apiKey');
    expect(code).toContain('tools: [');
  });

  it('should generate main function with agent.run()', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent'
    });

    expect(code).toContain('async function main()');
  });

  it('should throw error for invalid template ID', () => {
    expect(() => {
      generator.generateFullCode({
        templateId: 'non-existent',
        agentName: 'TestAgent'
      });
    }).toThrow();
  });

  it('should extract tool names from generated code', () => {
    const code = generator.generateFullCode({
      templateId: 'data-analyst',
      agentName: 'TestAgent'
    });

    const toolNames = extractToolNames(code);
    expect(toolNames.length).toBeGreaterThan(0);
    const expectedNames = ['read_csv', 'readCsvTool'];
    expect(toolNames.some(name => expectedNames.includes(name))).toBe(true);
  });
});
