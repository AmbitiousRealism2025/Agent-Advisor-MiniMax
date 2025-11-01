/**
 * E2E Tests - Content Creator Template
 */

import { describe, it, expect } from 'vitest';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import { CodeGenerator } from '../../src/lib/generation/code-generator.js';
import { PromptGenerator } from '../../src/lib/generation/prompt-generator.js';
import { sampleContentCreatorRequirements } from '../fixtures/sample-requirements.js';
import { extractToolNames } from '../utils/test-helpers.js';

describe('Content Creator Template E2E', () => {
  it('should generate complete content creator agent from requirements', () => {
    const classifier = new AgentClassifier();
    const codeGenerator = new CodeGenerator();

    const recommendations = classifier.classify(sampleContentCreatorRequirements);
    expect(recommendations.agentType).toBe('content-creator');

    const code = codeGenerator.generateFullCode({
      templateId: 'content-creator',
      agentName: sampleContentCreatorRequirements.name
    });

    const tools = extractToolNames(code);
    expect(tools).toContain('generate_outline');
    expect(tools).toContain('write_section');
    expect(tools).toContain('optimize_for_seo');
    expect(tools).toContain('format_content');
  });

  it('should generate customized system prompt', () => {
    const promptGenerator = new PromptGenerator();

    const prompt = promptGenerator.generate({
      templateId: 'content-creator',
      requirements: sampleContentCreatorRequirements,
      verbosityLevel: 'standard'
    });

    expect(prompt).toContain(sampleContentCreatorRequirements.name);
    expect(prompt).toContain('content');
  });

  it('should classify content creation requirements correctly', () => {
    const classifier = new AgentClassifier();
    const recommendations = classifier.classify(sampleContentCreatorRequirements);

    expect(recommendations.agentType).toBe('content-creator');
    expect(recommendations.estimatedComplexity).toBeDefined();
    expect(recommendations.toolConfigurations.length).toBe(4);
  });
});
