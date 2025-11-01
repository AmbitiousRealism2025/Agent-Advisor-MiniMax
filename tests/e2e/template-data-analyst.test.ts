/**
 * E2E Tests - Data Analyst Template
 */

import { describe, it, expect } from 'vitest';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import { CodeGenerator } from '../../src/lib/generation/code-generator.js';
import { sampleDataAnalystRequirements } from '../fixtures/sample-requirements.js';
import { extractToolNames } from '../utils/test-helpers.js';

describe('Data Analyst Template E2E', () => {
  it('should generate complete data analyst agent from requirements', () => {
    const classifier = new AgentClassifier();
    const codeGenerator = new CodeGenerator();

    const recommendations = classifier.classify(sampleDataAnalystRequirements);
    expect(recommendations.agentType).toBe('data-analyst');

    const code = codeGenerator.generateFullCode({
      templateId: 'data-analyst',
      agentName: sampleDataAnalystRequirements.name
    });

    const tools = extractToolNames(code);
    expect(tools).toContain('read_csv');
    expect(tools).toContain('analyze_data');
  });
});
