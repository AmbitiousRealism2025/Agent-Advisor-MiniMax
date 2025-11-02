/**
 * End-to-End Tests: Code Compilation Validation
 *
 * Validates that generated code extracted from Markdown compiles and aligns with
 * template specifications across all templates and generation options.
 *
 * NOTE: Test parallelism is disabled for E2E tests (see vitest.config.ts:45-47)
 * to avoid race conditions in temp directories and streaming outputs.
 */

import { describe, it, expect } from 'vitest';
import {
  GenerateAgentCodeHandler,
  GenerateConfigFilesHandler
} from '../../src/lib/generation/tool-handlers.js';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import {
  sampleDataAnalystRequirements,
  allSampleRequirements,
  expectedTemplateIds
} from '../fixtures/sample-requirements.js';
import {
  extractCodeFromMarkdown,
  extractFileMapping
} from '../utils/markdown-validator.js';
import {
  compileTypeScriptInTempDir,
  validateTypeScriptCode,
  validateJSON,
  extractToolNames
} from '../utils/test-helpers.js';
import { ALL_TEMPLATES } from '../../src/templates/index.js';

const agentCodeHandler = new GenerateAgentCodeHandler();
const configFilesHandler = new GenerateConfigFilesHandler();
const classifier = new AgentClassifier();

function getMarkdownFromResult(result: { content: Array<{ type: 'text'; text: string }> }): string {
  return result.content[0]?.text ?? '';
}

describe('Code Compilation from Markdown E2E', () => {
  it('should extract and compile data analyst code from Markdown', async () => {
    const codeMarkdown = getMarkdownFromResult(await agentCodeHandler.handle({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name,
      includeComments: true,
      includeErrorHandling: true,
      includeSampleUsage: true
    }));

    const tsBlocks = extractCodeFromMarkdown(codeMarkdown, 'typescript');
    expect(tsBlocks.length).toBeGreaterThan(0);
    const primaryBlock = tsBlocks[0];

    const syntaxValidation = validateTypeScriptCode(primaryBlock);
    expect(syntaxValidation.errors).toHaveLength(0);

    const compilation = await compileTypeScriptInTempDir(primaryBlock);
    const nonModuleErrors = compilation.errors.filter(error => !/Cannot find module/.test(error));
    expect(nonModuleErrors).toHaveLength(0);

    expect(primaryBlock).toContain('new Agent');
    expect(primaryBlock).toContain('read_csv');
    expect(primaryBlock).toContain('analyze_data');
    expect(primaryBlock).toContain('generate_visualization');
    expect(primaryBlock).toContain('export_report');
  }, { timeout: 20000 });

  it('should compile code from all 5 templates', async () => {
    const failures: string[] = [];

    for (let index = 0; index < allSampleRequirements.length; index++) {
      const templateId = expectedTemplateIds[index];
      const requirements = allSampleRequirements[index];

      const codeMarkdown = getMarkdownFromResult(await agentCodeHandler.handle({
        templateId,
        agentName: requirements.name,
        includeComments: true,
        includeErrorHandling: true,
        includeSampleUsage: true
      }));
      const tsBlocks = extractCodeFromMarkdown(codeMarkdown, 'typescript');

      if (tsBlocks.length === 0) {
        failures.push(`${templateId}: no TypeScript block found`);
        continue;
      }

      const validation = validateTypeScriptCode(tsBlocks[0]);
      if (validation.errors.length > 0) {
        failures.push(`${templateId}: TypeScript syntax errors -> ${validation.errors.join(', ')}`);
        continue;
      }

      const compilation = await compileTypeScriptInTempDir(tsBlocks[0]);
      const nonModuleErrors = compilation.errors.filter(error => !/Cannot find module/.test(error));
      if (nonModuleErrors.length > 0) {
        failures.push(`${templateId}: unexpected compilation errors -> ${nonModuleErrors.join(', ')}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Compilation failures detected:\n${failures.join('\n')}`);
    }
  }, { timeout: 60000 });

  it('should validate JSON config files from Markdown', async () => {
    const recommendations = classifier.classify(sampleDataAnalystRequirements);
    const configMarkdown = getMarkdownFromResult(await configFilesHandler.handle({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name,
      requirements: sampleDataAnalystRequirements,
      recommendations,
      files: ['agent-config', 'env', 'package', 'tsconfig', 'readme']
    }));

    const fileMap = extractFileMapping(configMarkdown);

    const packageJson = fileMap.get('package.json');
    const tsconfigJson = fileMap.get('tsconfig.json');
    const agentConfig = fileMap.get('agent.config.json');

    expect(packageJson).toBeDefined();
    expect(tsconfigJson).toBeDefined();
    expect(agentConfig).toBeDefined();

    expect(validateJSON(packageJson!).valid).toBe(true);
    expect(validateJSON(tsconfigJson!).valid).toBe(true);
    expect(validateJSON(agentConfig!).valid).toBe(true);
  });

  it('should validate generated code follows TypeScript best practices', async () => {
    const codeMarkdown = getMarkdownFromResult(await agentCodeHandler.handle({
      templateId: 'code-assistant',
      agentName: allSampleRequirements[2].name,
      includeComments: true,
      includeErrorHandling: true,
      includeSampleUsage: true
    }));

    const tsBlocks = extractCodeFromMarkdown(codeMarkdown, 'typescript');
    expect(tsBlocks.length).toBeGreaterThan(0);
    const code = tsBlocks[0];

    expect(code).toContain("import { Agent, tool } from '@anthropic-ai/claude-agent-sdk';");
    expect(code).toContain("import { z } from 'zod';");
    expect(code).not.toMatch(/:\s*any/);
    expect(code).toMatch(/export const \w+Tool/);
    expect(code).toContain(".js'");
  });

  it('should compile code with different generation options', async () => {
    const optionSets = [
      { includeComments: false, includeErrorHandling: true, includeSampleUsage: true },
      { includeComments: true, includeErrorHandling: false, includeSampleUsage: true },
      { includeComments: true, includeErrorHandling: true, includeSampleUsage: false },
      { includeComments: false, includeErrorHandling: false, includeSampleUsage: false }
    ];

    for (const options of optionSets) {
      const codeMarkdown = getMarkdownFromResult(await agentCodeHandler.handle({
        templateId: 'data-analyst',
        agentName: sampleDataAnalystRequirements.name,
        ...options
      }));
      const tsBlocks = extractCodeFromMarkdown(codeMarkdown, 'typescript');
      expect(tsBlocks.length).toBeGreaterThan(0);

      const validation = validateTypeScriptCode(tsBlocks[0]);
      expect(validation.errors).toHaveLength(0);

      const compilation = await compileTypeScriptInTempDir(tsBlocks[0]);
      const nonModuleErrors = compilation.errors.filter(error => !/Cannot find module/.test(error));
      expect(nonModuleErrors).toHaveLength(0);
    }
  }, { timeout: 30000 });

  it('should validate tool definitions match template specifications', async () => {
    const templateToolMap = ALL_TEMPLATES.reduce<Record<string, string[]>>((acc, template) => {
      acc[template.id] = template.defaultTools.map(toolConfig => toolConfig.name);
      return acc;
    }, {});

    for (let index = 0; index < expectedTemplateIds.length; index++) {
      const templateId = expectedTemplateIds[index];
      const requirements = allSampleRequirements[index];

      const codeMarkdown = getMarkdownFromResult(await agentCodeHandler.handle({
        templateId,
        agentName: requirements.name,
        includeComments: true,
        includeErrorHandling: true,
        includeSampleUsage: true
      }));

      const tsBlocks = extractCodeFromMarkdown(codeMarkdown, 'typescript');
      expect(tsBlocks.length).toBeGreaterThan(0);

      const toolNames = extractToolNames(tsBlocks[0]);
      const expectedTools = templateToolMap[templateId];
      expectedTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });
      expect(toolNames.length).toBeGreaterThanOrEqual(expectedTools.length);
    }
  });
});
