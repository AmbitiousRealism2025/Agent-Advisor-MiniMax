/**
 * E2E Tests - Automation Agent Template
 */

import { describe, it, expect } from 'vitest';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import { CodeGenerator } from '../../src/lib/generation/code-generator.js';
import { PromptGenerator } from '../../src/lib/generation/prompt-generator.js';
import { sampleAutomationAgentRequirements } from '../fixtures/sample-requirements.js';
import { extractToolNames } from '../utils/test-helpers.js';

describe('Automation Agent Template E2E', () => {
  it('should generate complete automation agent from requirements', () => {
    const classifier = new AgentClassifier();
    const codeGenerator = new CodeGenerator();

    const recommendations = classifier.classify(sampleAutomationAgentRequirements);
    expect(recommendations.agentType).toBe('automation-agent');

    const code = codeGenerator.generateFullCode({
      templateId: 'automation-agent',
      agentName: sampleAutomationAgentRequirements.name
    });

    const tools = extractToolNames(code);
    expect(tools).toContain('schedule_task');
    expect(tools).toContain('execute_workflow');
    expect(tools).toContain('monitor_status');
    expect(tools).toContain('manage_queue');
  });

  it('should generate customized system prompt', () => {
    const promptGenerator = new PromptGenerator();

    const prompt = promptGenerator.generate({
      templateId: 'automation-agent',
      requirements: sampleAutomationAgentRequirements,
      verbosityLevel: 'standard'
    });

    expect(prompt).toContain(sampleAutomationAgentRequirements.name);
    expect(prompt).toContain('automation');
  });

  it('should classify automation requirements correctly', () => {
    const classifier = new AgentClassifier();
    const recommendations = classifier.classify(sampleAutomationAgentRequirements);

    expect(recommendations.agentType).toBe('automation-agent');
    expect(recommendations.estimatedComplexity).toBeDefined();
    expect(recommendations.toolConfigurations.length).toBe(4);
  });
});
