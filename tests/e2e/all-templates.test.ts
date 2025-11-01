/**
 * End-to-End Tests - All Templates
 *
 * Validates that all 5 templates work end-to-end with their sample requirements.
 */

import { describe, it, expect } from 'vitest';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import { CodeGenerator } from '../../src/lib/generation/code-generator.js';
import { PromptGenerator } from '../../src/lib/generation/prompt-generator.js';
import { ConfigGenerator } from '../../src/lib/generation/config-generator.js';
import {
  allSampleRequirements,
  expectedTemplateIds
} from '../fixtures/sample-requirements.js';
import { validateTypeScriptCode, validateJSON } from '../utils/test-helpers.js';

describe('All Templates E2E', () => {
  const classifier = new AgentClassifier();
  const codeGenerator = new CodeGenerator();
  const promptGenerator = new PromptGenerator();
  const configGenerator = new ConfigGenerator();

  it('should generate valid agents for all 5 templates', () => {
    const failures: string[] = [];

    allSampleRequirements.forEach((requirements, index) => {
      const expectedTemplateId = expectedTemplateIds[index];

      try {
        // Classify
        const recommendations = classifier.classify(requirements);
        expect(recommendations.agentType).toBe(expectedTemplateId);

        // Generate code
        const code = codeGenerator.generateFullCode({
          templateId: recommendations.agentType,
          agentName: requirements.name
        });
        expect(code).toBeDefined();
        expect(code.length).toBeGreaterThan(100);

        // Validate TypeScript
        const validation = validateTypeScriptCode(code);
        if (!validation.valid) {
          failures.push(`${expectedTemplateId}: TypeScript validation failed - ${validation.errors.join(', ')}`);
        }

        // Generate prompt
        const prompt = promptGenerator.generate({
          templateId: recommendations.agentType,
          requirements
        });
        expect(prompt).toBeDefined();
        expect(prompt).toContain(requirements.name);

        // Generate configs
        const packageJson = configGenerator.generatePackageJSON({
          templateId: recommendations.agentType,
          agentName: requirements.name,
          requirements
        });
        const packageValidation = validateJSON(packageJson);
        if (!packageValidation.valid) {
          failures.push(`${expectedTemplateId}: package.json validation failed`);
        }

      } catch (error) {
        failures.push(`${expectedTemplateId}: ${(error as Error).message}`);
      }
    });

    if (failures.length > 0) {
      throw new Error(`Template E2E failures:\n${failures.join('\n')}`);
    }
  });

  it('should generate unique code for each template', () => {
    const generatedCodes = allSampleRequirements.map((requirements, index) => {
      const templateId = expectedTemplateIds[index];
      return codeGenerator.generateFullCode({
        templateId,
        agentName: requirements.name
      });
    });

    // Each code should be different
    const uniqueCodes = new Set(generatedCodes);
    expect(uniqueCodes.size).toBe(5);
  });

  it('should generate appropriate dependencies for each template', () => {
    const requirements = allSampleRequirements;
    const templateIds = expectedTemplateIds;

    // Data analyst should include csv-parse
    const dataAnalystPkg = configGenerator.generatePackageJSON({
      templateId: templateIds[0],
      agentName: requirements[0].name,
      requirements: requirements[0]
    });
    expect(dataAnalystPkg).toContain('csv-parse');

    // Content creator should include required dependencies
    const contentCreatorPkg = configGenerator.generatePackageJSON({
      templateId: templateIds[1],
      agentName: requirements[1].name,
      requirements: requirements[1]
    });
    expect(contentCreatorPkg).toContain('@anthropic-ai/claude-agent-sdk');
    expect(contentCreatorPkg).toContain('zod');
  });

  it('should classify each template correctly', () => {
    allSampleRequirements.forEach((requirements, index) => {
      const expectedTemplateId = expectedTemplateIds[index];
      const recommendations = classifier.classify(requirements);
      expect(recommendations.agentType).toBe(expectedTemplateId);
    });
  });

  it('should generate valid TypeScript for all templates', () => {
    const failures: string[] = [];

    expectedTemplateIds.forEach((templateId, index) => {
      const code = codeGenerator.generateFullCode({
        templateId,
        agentName: allSampleRequirements[index].name
      });

      const validation = validateTypeScriptCode(code);
      if (!validation.valid) {
        failures.push(`${templateId}: ${validation.errors.join(', ')}`);
      }
    });

    expect(failures).toEqual([]);
  });
});
