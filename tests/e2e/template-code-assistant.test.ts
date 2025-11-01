/**
 * E2E Tests - Code Assistant Template
 */

import { describe, it, expect } from 'vitest';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import { CodeGenerator } from '../../src/lib/generation/code-generator.js';
import { PromptGenerator } from '../../src/lib/generation/prompt-generator.js';
import { sampleCodeAssistantRequirements } from '../fixtures/sample-requirements.js';
import { extractToolNames } from '../utils/test-helpers.js';

describe('Code Assistant Template E2E', () => {
  it('should generate complete code assistant agent from requirements', () => {
    const classifier = new AgentClassifier();
    const codeGenerator = new CodeGenerator();

    const recommendations = classifier.classify(sampleCodeAssistantRequirements);
    expect(recommendations.agentType).toBe('code-assistant');

    const code = codeGenerator.generateFullCode({
      templateId: 'code-assistant',
      agentName: sampleCodeAssistantRequirements.name
    });

    const tools = extractToolNames(code);
    expect(tools).toContain('analyze_code');
    expect(tools).toContain('suggest_improvements');
    expect(tools).toContain('generate_tests');
    expect(tools).toContain('refactor_code');
  });

  it('should generate customized system prompt', () => {
    const promptGenerator = new PromptGenerator();

    const prompt = promptGenerator.generate({
      templateId: 'code-assistant',
      requirements: sampleCodeAssistantRequirements,
      verbosityLevel: 'standard'
    });

    expect(prompt).toContain(sampleCodeAssistantRequirements.name);
    expect(prompt).toContain('code');
  });

  it('should classify code assistance requirements correctly', () => {
    const classifier = new AgentClassifier();
    const recommendations = classifier.classify(sampleCodeAssistantRequirements);

    expect(recommendations.agentType).toBe('code-assistant');
    expect(recommendations.estimatedComplexity).toBeDefined();
    expect(recommendations.toolConfigurations.length).toBe(4);
  });
});
