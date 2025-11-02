/**
 * End-to-End Test Suite: Advisor Workflow
 *
 * Validates the complete advisor workflow from interview simulation through
 * classification and generation, verifying Markdown outputs and TypeScript compilation.
 *
 * NOTE: Test parallelism is disabled for E2E tests (see vitest.config.ts:45-47)
 * to avoid race conditions in temp directories and streaming outputs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InterviewStateManager } from '../../src/lib/interview/state-manager.js';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import { CodeGenerator } from '../../src/lib/generation/code-generator.js';
import {
  GenerateAgentCodeHandler,
  GenerateSystemPromptHandler,
  GenerateConfigFilesHandler
} from '../../src/lib/generation/tool-handlers.js';
import { INTERVIEW_QUESTIONS } from '../../src/lib/interview/questions.js';
import {
  sampleDataAnalystRequirements,
  allSampleRequirements,
  expectedTemplateIds
} from '../fixtures/sample-requirements.js';
import {
  extractToolNames,
  compileTypeScriptInTempDir,
  validateTypeScriptCode,
  validateJSON
} from '../utils/test-helpers.js';
import {
  parseMarkdownDocument,
  validateMarkdownStructure,
  extractCodeFromMarkdown,
  extractFileMapping,
  validateCodeBlock
} from '../utils/markdown-validator.js';
import type { AgentRequirements } from '../../src/types/agent.js';
import type { InterviewQuestion } from '../../src/types/interview.js';

function resolveResponseForQuestion(
  question: InterviewQuestion,
  requirements: AgentRequirements
): string | boolean | string[] {
  switch (question.id) {
    case 'q1_agent_name':
      return requirements.name;
    case 'q2_primary_outcome':
      return requirements.primaryOutcome;
    case 'q3_target_audience':
      return requirements.targetAudience;
    case 'q4_interaction_style':
      return requirements.interactionStyle;
    case 'q5_delivery_channels':
      return requirements.deliveryChannels;
    case 'q6_success_metrics':
      return requirements.successMetrics;
    case 'q7_memory_needs':
      return requirements.capabilities.memory;
    case 'q8_file_access':
      return requirements.capabilities.fileAccess;
    case 'q9_web_access':
      return requirements.capabilities.webAccess;
    case 'q10_code_execution':
      return requirements.capabilities.codeExecution;
    case 'q11_data_analysis':
      return requirements.capabilities.dataAnalysis;
    case 'q12_tool_integrations':
      return (requirements.capabilities.toolIntegrations || []).join(', ');
    case 'q13_runtime_preference':
      return requirements.environment?.runtime || 'local';
    case 'q14_constraints':
      return (requirements.constraints || []).join(', ');
    case 'q15_additional_notes':
      return requirements.additionalNotes || '';
    default:
      return '';
  }
}

function simulateInterviewFromRequirements(
  manager: InterviewStateManager,
  requirements: AgentRequirements
): void {
  manager.initializeSession();

  INTERVIEW_QUESTIONS.forEach(question => {
    const response = resolveResponseForQuestion(question, requirements);
    manager.recordResponse(question.id, response);
  });

  const completedState = manager.getState();
  manager.loadState({
    ...completedState,
    requirements: {
      ...completedState.requirements,
      ...requirements
    }
  });
}

describe('Advisor Workflow E2E', () => {
  let stateManager: InterviewStateManager;
  let classifier: AgentClassifier;
  let codeGenerator: CodeGenerator;
  let agentCodeHandler: GenerateAgentCodeHandler;
  let systemPromptHandler: GenerateSystemPromptHandler;
  let configFilesHandler: GenerateConfigFilesHandler;

  beforeEach(() => {
    stateManager = new InterviewStateManager();
    classifier = new AgentClassifier();
    codeGenerator = new CodeGenerator();
    agentCodeHandler = new GenerateAgentCodeHandler();
    systemPromptHandler = new GenerateSystemPromptHandler();
    configFilesHandler = new GenerateConfigFilesHandler();
  });

  it('should complete full workflow from interview to code generation', async () => {
    simulateInterviewFromRequirements(stateManager, sampleDataAnalystRequirements);

    const collectedRequirements = stateManager.getCollectedRequirements();
    const progress = stateManager.getProgress();
    const requirements: AgentRequirements = sampleDataAnalystRequirements;

    expect(stateManager.isComplete()).toBe(true);
    expect(progress.currentStage).toBe('complete');
    expect(progress.percentage).toBe(100);
    expect(collectedRequirements.name).toBe(requirements.name);
    expect(collectedRequirements.primaryOutcome).toBe(requirements.primaryOutcome);
    expect(collectedRequirements.capabilities?.dataAnalysis).toBe(true);

    expect(requirements.name).toBeTruthy();
    expect(requirements.primaryOutcome).toBeTruthy();
    expect(requirements.targetAudience.length).toBeGreaterThan(0);
    expect(requirements.successMetrics.length).toBeGreaterThan(0);
    expect(requirements.capabilities).toBeDefined();

    const recommendations = classifier.classify(requirements);
    expect(recommendations.agentType).toBe('data-analyst');

    const generatedCode = codeGenerator.generateFullCode({
      templateId: recommendations.agentType,
      agentName: requirements.name,
      includeComments: true,
      includeErrorHandling: true,
      includeSampleUsage: true
    });

    expect(generatedCode).toBeTruthy();
    expect(generatedCode).toContain("@anthropic-ai/claude-agent-sdk");
    expect(generatedCode).toContain('read_csv');

    const toolNames = extractToolNames(generatedCode);
    expect(toolNames).toContain('read_csv');
    expect(toolNames).toContain('analyze_data');
    expect(toolNames).toContain('generate_visualization');
    expect(toolNames).toContain('export_report');

    const syntaxValidation = validateTypeScriptCode(generatedCode);
    expect(syntaxValidation.errors).toHaveLength(0);
  });

  it('should generate valid Markdown from all generation tools', async () => {
    const requirements = sampleDataAnalystRequirements;
    const recommendations = classifier.classify(requirements);

    const codeResult = await agentCodeHandler.handle({
      templateId: 'data-analyst',
      agentName: requirements.name,
      includeComments: true,
      includeErrorHandling: true,
      includeSampleUsage: true
    });
    const codeMarkdown = codeResult.content[0]?.text ?? '';
    const codeValidation = validateMarkdownStructure(codeMarkdown);
    expect(codeValidation.valid).toBe(true);
    expect(codeValidation.errors).toHaveLength(0);

    const promptResult = await systemPromptHandler.handle({
      templateId: 'data-analyst',
      requirements,
      includeExamples: true,
      includeConstraints: true,
      verbosityLevel: 'standard'
    });
    const promptMarkdown = promptResult.content[0]?.text ?? '';
    const promptValidation = validateMarkdownStructure(promptMarkdown);
    expect(promptValidation.valid).toBe(true);

    const configResult = await configFilesHandler.handle({
      templateId: 'data-analyst',
      agentName: requirements.name,
      requirements,
      recommendations,
      files: ['agent-config', 'env', 'package', 'tsconfig', 'readme', 'implementation-guide']
    });
    const configMarkdown = configResult.content[0]?.text ?? '';
    const configValidation = validateMarkdownStructure(configMarkdown);
    expect(configValidation.valid).toBe(true);

    const codeDocument = parseMarkdownDocument(codeMarkdown);
    expect(codeDocument.codeBlocks.every(block => !!block.language)).toBe(true);
    expect(codeDocument.fileHeaders).toContain('src/index.ts');

    const promptDocument = parseMarkdownDocument(promptMarkdown);
    expect(promptDocument.fileHeaders).toContain('system-prompt.md');

    const configDocument = parseMarkdownDocument(configMarkdown);
    expect(configDocument.fileHeaders).toContain('package.json');
    expect(configDocument.fileHeaders).toContain('.env.example');
  });

  it('should extract and compile TypeScript from Markdown', async () => {
    const codeMarkdown = (
      await agentCodeHandler.handle({
        templateId: 'data-analyst',
        agentName: sampleDataAnalystRequirements.name,
        includeComments: true,
        includeErrorHandling: true,
        includeSampleUsage: true
      })
    ).content[0]?.text ?? '';

    const typeScriptBlocks = extractCodeFromMarkdown(codeMarkdown, 'typescript');
    expect(typeScriptBlocks.length).toBeGreaterThan(0);

    const primaryBlock = typeScriptBlocks[0];
    const syntaxValidation = validateTypeScriptCode(primaryBlock);
    expect(syntaxValidation.errors).toHaveLength(0);

    const compilationResult = await compileTypeScriptInTempDir(primaryBlock);
    const nonModuleErrors = compilationResult.errors.filter(error => !/Cannot find module/.test(error));
    expect(nonModuleErrors).toHaveLength(0);

    expect(primaryBlock).toContain('new Agent');
    expect(primaryBlock).toContain('readCsvTool');
  }, { timeout: 20000 });

  it('should generate complete project files for all 5 templates', async () => {
    const failures: string[] = [];

    for (let index = 0; index < allSampleRequirements.length; index++) {
      const requirements = allSampleRequirements[index];
      const expectedTemplateId = expectedTemplateIds[index];

      try {
        const recommendations = classifier.classify(requirements);
        expect(recommendations.agentType).toBe(expectedTemplateId);

        const codeMarkdown = (
          await agentCodeHandler.handle({
            templateId: expectedTemplateId,
            agentName: requirements.name,
            includeComments: true,
            includeErrorHandling: true,
            includeSampleUsage: true
          })
        ).content[0]?.text ?? '';
        const promptMarkdown = (
          await systemPromptHandler.handle({
            templateId: expectedTemplateId,
            requirements,
            includeExamples: true,
            includeConstraints: true,
            verbosityLevel: 'standard'
          })
        ).content[0]?.text ?? '';
        const configMarkdown = (
          await configFilesHandler.handle({
            templateId: expectedTemplateId,
            agentName: requirements.name,
            requirements,
            recommendations,
            files: ['agent-config', 'env', 'package', 'tsconfig', 'readme', 'implementation-guide']
          })
        ).content[0]?.text ?? '';

        const codeValidation = validateMarkdownStructure(codeMarkdown);
        const promptValidation = validateMarkdownStructure(promptMarkdown);
        const configValidation = validateMarkdownStructure(configMarkdown);

        if (!codeValidation.valid) {
          failures.push(`${expectedTemplateId}: code markdown errors -> ${codeValidation.errors.join(', ')}`);
        }
        if (!promptValidation.valid) {
          failures.push(`${expectedTemplateId}: prompt markdown errors -> ${promptValidation.errors.join(', ')}`);
        }
        if (!configValidation.valid) {
          failures.push(`${expectedTemplateId}: config markdown errors -> ${configValidation.errors.join(', ')}`);
        }

        const tsBlocks = extractCodeFromMarkdown(codeMarkdown, 'typescript');
        expect(tsBlocks.length).toBeGreaterThan(0);

        const tsValidation = validateTypeScriptCode(tsBlocks[0]);
        if (tsValidation.errors.length > 0) {
          failures.push(`${expectedTemplateId}: TypeScript syntax errors -> ${tsValidation.errors.join(', ')}`);
        }

        const toolExpectationMap: Record<string, string[]> = {
          'data-analyst': ['read_csv', 'analyze_data', 'generate_visualization', 'export_report'],
          'content-creator': ['generate_outline', 'write_section', 'optimize_for_seo', 'format_content'],
          'code-assistant': ['analyze_code', 'suggest_improvements', 'generate_tests', 'refactor_code'],
          'research-agent': ['web_search', 'scrape_content', 'extract_facts', 'verify_sources'],
          'automation-agent': ['schedule_task', 'execute_workflow', 'monitor_status', 'manage_queue']
        };
        const codeContent = tsBlocks[0];
        const expectedTools = toolExpectationMap[expectedTemplateId];
        expectedTools.forEach(toolName => {
          if (!codeContent.includes(toolName)) {
            failures.push(`${expectedTemplateId}: missing tool definition for ${toolName}`);
          }
        });
      } catch (error) {
        failures.push(`${expectedTemplateId}: ${(error as Error).message}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Template validations failed:\n${failures.join('\n')}`);
    }
  }, { timeout: 60000 });

  it('should maintain file mapping consistency', async () => {
    const requirements = sampleDataAnalystRequirements;
    const recommendations = classifier.classify(requirements);

    const configMarkdown = (
      await configFilesHandler.handle({
        templateId: 'data-analyst',
        agentName: requirements.name,
        requirements,
        recommendations,
        files: ['agent-config', 'env', 'package', 'tsconfig', 'readme', 'implementation-guide']
      })
    ).content[0]?.text ?? '';

    const fileMapping = extractFileMapping(configMarkdown);
    const expectedFiles = ['package.json', 'tsconfig.json', '.env.example', 'README.md', 'IMPLEMENTATION.md'];
    expectedFiles.forEach(fileName => {
      expect(fileMapping.has(fileName)).toBe(true);
    });

    const packageJsonContent = fileMapping.get('package.json');
    if (packageJsonContent) {
      const packageValidation = validateJSON(packageJsonContent);
      expect(packageValidation.valid).toBe(true);
      expect(packageValidation.data?.name).toBeDefined();
    }

    const tsconfigContent = fileMapping.get('tsconfig.json');
    if (tsconfigContent) {
      const tsconfigValidation = validateJSON(tsconfigContent);
      expect(tsconfigValidation.valid).toBe(true);
      expect(tsconfigValidation.data?.compilerOptions).toBeDefined();
    }

    const readmeContent = fileMapping.get('README.md') ?? '';
    expect(readmeContent).toContain(requirements.name);
    expect(readmeContent).toContain(requirements.primaryOutcome);

    const markdownDocument = parseMarkdownDocument(configMarkdown);
    markdownDocument.codeBlocks.forEach(block => {
      const validation = validateCodeBlock(block);
      expect(validation.valid).toBe(true);
    });
  });
});
