/**
 * Unit Tests - Config Generator
 */

import { describe, it, expect } from 'vitest';
import { ConfigGenerator } from '../../../src/lib/generation/config-generator.js';
import { sampleDataAnalystRequirements } from '../../fixtures/sample-requirements.js';
import { validateJSON } from '../../utils/test-helpers.js';

describe('ConfigGenerator', () => {
  const generator = new ConfigGenerator();

  it('should generate valid package.json', () => {
    const packageJson = generator.generatePackageJSON({
      templateId: 'data-analyst',
      agentName: 'TestAgent',
      requirements: sampleDataAnalystRequirements
    });

    const validation = validateJSON(packageJson);
    expect(validation.valid).toBe(true);
  });

  it('should generate .env file', () => {
    const envFile = generator.generateEnvFile({
      templateId: 'data-analyst',
      agentName: 'TestAgent',
      requirements: sampleDataAnalystRequirements
    });

    expect(envFile).toContain('MINIMAX_JWT_TOKEN');
  });
});
