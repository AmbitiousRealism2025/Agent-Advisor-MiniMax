/**
 * Unit Tests - Prompt Generator
 */

import { describe, it, expect } from 'vitest';
import { PromptGenerator } from '../../../src/lib/generation/prompt-generator.js';
import { sampleDataAnalystRequirements } from '../../fixtures/sample-requirements.js';

describe('PromptGenerator', () => {
  const generator = new PromptGenerator();

  it('should generate prompt with all sections', () => {
    const prompt = generator.generate({
      templateId: 'data-analyst',
      requirements: sampleDataAnalystRequirements
    });

    expect(prompt).toBeDefined();
    expect(prompt).toContain(sampleDataAnalystRequirements.name);
    expect(prompt).toContain('Role');
    expect(prompt).toContain('Capabilities');
  });

  it('should include agent name and description', () => {
    const prompt = generator.generate({
      templateId: 'data-analyst',
      requirements: sampleDataAnalystRequirements
    });

    expect(prompt).toContain(sampleDataAnalystRequirements.name);
    expect(prompt).toContain(sampleDataAnalystRequirements.description);
  });
});
