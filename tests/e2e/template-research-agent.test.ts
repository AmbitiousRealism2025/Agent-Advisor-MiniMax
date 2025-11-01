/**
 * E2E Tests - Research Agent Template
 */

import { describe, it, expect } from 'vitest';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import { CodeGenerator } from '../../src/lib/generation/code-generator.js';
import { PromptGenerator } from '../../src/lib/generation/prompt-generator.js';
import { sampleResearchAgentRequirements } from '../fixtures/sample-requirements.js';
import { extractToolNames } from '../utils/test-helpers.js';

describe('Research Agent Template E2E', () => {
  it('should generate complete research agent from requirements', () => {
    const classifier = new AgentClassifier();
    const codeGenerator = new CodeGenerator();

    const recommendations = classifier.classify(sampleResearchAgentRequirements);
    expect(recommendations.agentType).toBe('research-agent');

    const code = codeGenerator.generateFullCode({
      templateId: 'research-agent',
      agentName: sampleResearchAgentRequirements.name
    });

    const tools = extractToolNames(code);
    expect(tools).toContain('web_search');
    expect(tools).toContain('scrape_content');
    expect(tools).toContain('extract_facts');
    expect(tools).toContain('verify_sources');
  });

  it('should generate customized system prompt', () => {
    const promptGenerator = new PromptGenerator();

    const prompt = promptGenerator.generate({
      templateId: 'research-agent',
      requirements: sampleResearchAgentRequirements,
      verbosityLevel: 'standard'
    });

    expect(prompt).toContain(sampleResearchAgentRequirements.name);
    expect(prompt).toContain('research');
  });

  it('should classify research requirements correctly', () => {
    const classifier = new AgentClassifier();
    const recommendations = classifier.classify(sampleResearchAgentRequirements);

    expect(recommendations.agentType).toBe('research-agent');
    expect(recommendations.estimatedComplexity).toBeDefined();
    expect(recommendations.toolConfigurations.length).toBe(4);
  });
});
