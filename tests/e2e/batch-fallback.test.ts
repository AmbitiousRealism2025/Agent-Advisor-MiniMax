import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentGenerationPipeline } from '../../src/pipeline.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CLI Batch Fallback E2E', () => {
  let pipeline: AgentGenerationPipeline;
  const testOutputDir = './test-output-batch';

  beforeEach(() => {
    pipeline = new AgentGenerationPipeline();
  });

  afterEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should successfully run pipeline with valid interview question IDs', async () => {
    // Simulate the batch fallback with valid interview question IDs
    const minimalResponses: Record<string, any> = {
      q1_agent_name: 'BatchTestAgent',
      q2_primary_outcome: 'Test batch fallback functionality',
      q3_target_audience: ['developers'],
      q4_interaction_style: 'conversational',
      q5_delivery_channels: ['cli'],
      q6_success_metrics: ['accuracy', 'speed'],
      q7_memory_needs: 'short-term',
      q8_file_access: false,
      q9_web_access: false,
      q10_code_execution: false,
      q11_data_analysis: false,
      q12_tool_integrations: '',
      q13_runtime_preference: 'local',
      q14_constraints: '',
      q15_additional_notes: 'E2E test for batch fallback',
    };

    const result = await pipeline.runFullPipeline(minimalResponses, {
      verboseLogging: false,
      outputDir: testOutputDir,
      autoPackage: true,
    });

    // Verify pipeline success
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();

    // Verify requirements were extracted correctly
    expect(result.requirements).toBeDefined();
    expect(result.requirements?.name).toBe('BatchTestAgent');
    expect(result.requirements?.primaryOutcome).toBe('Test batch fallback functionality');

    // Verify classification occurred
    expect(result.recommendations).toBeDefined();
    expect(result.recommendations?.agentType).toBeDefined();

    // Verify all files were generated
    expect(result.generatedFiles).toBeDefined();
    expect(result.generatedFiles?.code).toBeTruthy();
    expect(result.generatedFiles?.prompt).toBeTruthy();
    expect(result.generatedFiles?.packageJson).toBeTruthy();
    expect(result.generatedFiles?.readme).toBeTruthy();
    expect(result.generatedFiles?.implementationGuide).toBeTruthy();

    // Package result may vary depending on file system state, but should exist
    expect(result.packageResult).toBeDefined();
  });

  it('should fail gracefully with invalid question IDs', async () => {
    // Test with the OLD invalid format that should fail
    const invalidResponses: Record<string, any> = {
      agentName: 'InvalidAgent',
      primaryPurpose: 'This should fail',
      targetAudience: 'developers',
    };

    const result = await pipeline.runFullPipeline(invalidResponses, {
      verboseLogging: false,
      outputDir: testOutputDir,
      autoPackage: false,
    });

    // Should fail because requirements can't be extracted
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0]).toContain('Failed to extract valid requirements');
  });

  it('should require essential fields (name and primaryOutcome)', async () => {
    // Test with only name (missing primaryOutcome)
    const incompleteResponses: Record<string, any> = {
      q1_agent_name: 'PartialAgent',
      q4_interaction_style: 'conversational',
    };

    const result = await pipeline.runFullPipeline(incompleteResponses, {
      verboseLogging: false,
      outputDir: testOutputDir,
      autoPackage: false,
    });

    // Should fail because primaryOutcome is missing
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain('Failed to extract valid requirements');
  });

  it('should match the exact format used in CLI handleBatchMode', async () => {
    // This is the exact format from the fixed CLI handleBatchMode method
    const cliFormatResponses: Record<string, any> = {
      q1_agent_name: 'MyAgent',
      q2_primary_outcome: 'CLI batch mode test',
      q3_target_audience: ['developers'],
      q4_interaction_style: 'conversational',
      q5_delivery_channels: ['cli'],
      q6_success_metrics: ['accuracy', 'speed'],
      q7_memory_needs: 'short-term',
      q8_file_access: false,
      q9_web_access: false,
      q10_code_execution: false,
      q11_data_analysis: false,
      q12_tool_integrations: '',
      q13_runtime_preference: 'local',
      q14_constraints: '',
      q15_additional_notes: 'Batch mode test execution',
    };

    const result = await pipeline.runFullPipeline(cliFormatResponses, {
      verboseLogging: false,
      outputDir: testOutputDir,
      autoPackage: true,
    });

    // Verify complete success matching CLI expectations
    expect(result.success).toBe(true);
    expect(result.requirements?.name).toBe('MyAgent');
    expect(result.requirements?.primaryOutcome).toBe('CLI batch mode test');
    expect(result.requirements?.targetAudience).toEqual(['developers']);
    expect(result.requirements?.interactionStyle).toBe('conversational');
    expect(result.requirements?.capabilities?.memory).toBe('short-term');
    expect(result.generatedFiles).toBeDefined();

    // Package result may vary depending on file system state, but should exist
    expect(result.packageResult).toBeDefined();
  });
});
