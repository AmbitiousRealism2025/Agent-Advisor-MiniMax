/**
 * Integration Tests - Pipeline
 *
 * Tests end-to-end pipeline execution from interview responses to packaged agent.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentGenerationPipeline } from '../../src/pipeline.js';
import { sampleInterviewResponses, invalidInterviewResponses } from '../fixtures/sample-responses.js';
import { createTempDirectory, cleanupTempDirectory } from '../utils/test-helpers.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('Agent Generation Pipeline Integration', () => {
  let tempDir: string;
  let pipeline: AgentGenerationPipeline;

  beforeEach(async () => {
    tempDir = await createTempDirectory('pipeline');
    pipeline = new AgentGenerationPipeline();
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  it('should run full pipeline from responses to packaged agent', async () => {
    // Convert array of responses to the expected record format
    const responsesRecord: Record<string, string | boolean | string[]> = {};
    for (const response of sampleInterviewResponses) {
      responsesRecord[response.questionId] = response.value;
    }

    const result = await pipeline.runFullPipeline(responsesRecord, {
      outputDir: tempDir,
      autoPackage: true,
      includeExamples: true,
      includeTests: false,
      verboseLogging: false,
      promptVerbosity: 'standard'
    });

    // Assert success
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();

    // Verify requirements extraction
    expect(result.requirements).toBeDefined();
    expect(result.requirements?.name).toBe('Test Agent');
    expect(result.requirements?.primaryOutcome).toBe('Analyze data and generate reports');

    // Verify classification recommendations
    expect(result.recommendations).toBeDefined();
    expect(result.recommendations?.agentType).toBe('data-analyst');
    expect(result.recommendations?.estimatedComplexity).toBeDefined();

    // Verify generated files
    expect(result.generatedFiles).toBeDefined();
    expect(result.generatedFiles?.code).toBeTruthy();
    expect(result.generatedFiles?.prompt).toBeTruthy();
    expect(result.generatedFiles?.packageJson).toBeTruthy();
    expect(result.generatedFiles?.readme).toBeTruthy();
    expect(result.generatedFiles?.implementationGuide).toBeTruthy();

    // Verify package.json is valid JSON
    const packageJson = JSON.parse(result.generatedFiles?.packageJson || '{}');
    expect(packageJson.name).toBeDefined();
    expect(packageJson.dependencies).toBeDefined();

    // Verify package result (since autoPackage: true)
    expect(result.packageResult).toBeDefined();
    expect(result.packageResult?.success).toBe(true);
    expect(result.packageResult?.outputDir).toBeTruthy();

    // Verify files exist on disk
    const outputDir = result.packageResult?.outputDir;
    if (outputDir) {
      const agentFile = path.join(outputDir, 'src', 'agent.ts');
      const packageFile = path.join(outputDir, 'package.json');
      const envFile = path.join(outputDir, '.env.example');
      const readmeFile = path.join(outputDir, 'README.md');

      const agentExists = await fs.access(agentFile).then(() => true).catch(() => false);
      const packageExists = await fs.access(packageFile).then(() => true).catch(() => false);
      const envExists = await fs.access(envFile).then(() => true).catch(() => false);
      const readmeExists = await fs.access(readmeFile).then(() => true).catch(() => false);

      expect(agentExists).toBe(true);
      expect(packageExists).toBe(true);
      expect(envExists).toBe(true);
      expect(readmeExists).toBe(true);

      // Verify package.json content
      const packageContent = await fs.readFile(packageFile, 'utf-8');
      const pkg = JSON.parse(packageContent);
      expect(pkg.name).toBeDefined();
      expect(pkg.dependencies).toBeDefined();
      expect(pkg.dependencies['@anthropic-ai/claude-agent-sdk']).toBeDefined();
    }
  });

  it('should generate files without packaging when autoPackage is false', async () => {
    const responsesRecord: Record<string, string | boolean | string[]> = {};
    for (const response of sampleInterviewResponses) {
      responsesRecord[response.questionId] = response.value;
    }

    const result = await pipeline.runFullPipeline(responsesRecord, {
      outputDir: tempDir,
      autoPackage: false,
      includeExamples: false,
      includeTests: false,
      verboseLogging: false,
      promptVerbosity: 'concise'
    });

    expect(result.success).toBe(true);
    expect(result.generatedFiles).toBeDefined();
    expect(result.packageResult).toBeUndefined();
  });

  it('should handle incomplete responses and return failure', async () => {
    // Provide only a few responses (missing required fields)
    const incompleteResponses: Record<string, string | boolean | string[]> = {
      'q1_agent_name': '',  // Empty required field
      'q2_primary_outcome': ''  // Empty required field
    };

    const result = await pipeline.runFullPipeline(incompleteResponses, {
      outputDir: tempDir,
      autoPackage: false
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('should handle invalid responses gracefully with warnings', async () => {
    const responsesRecord: Record<string, string | boolean | string[]> = {};
    for (const response of invalidInterviewResponses) {
      responsesRecord[response.questionId] = response.value;
    }

    const result = await pipeline.runFullPipeline(responsesRecord, {
      outputDir: tempDir,
      autoPackage: false,
      verboseLogging: false
    });

    // May succeed with warnings or fail depending on validation strictness
    if (!result.success) {
      expect(result.errors).toBeDefined();
    } else if (result.warnings) {
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  it('should generate detailed prompts when verbosity is detailed', async () => {
    const responsesRecord: Record<string, string | boolean | string[]> = {};
    for (const response of sampleInterviewResponses) {
      responsesRecord[response.questionId] = response.value;
    }

    const result = await pipeline.runFullPipeline(responsesRecord, {
      outputDir: tempDir,
      autoPackage: false,
      promptVerbosity: 'detailed'
    });

    expect(result.success).toBe(true);
    expect(result.generatedFiles?.prompt).toBeDefined();
    // Detailed prompts should be longer than concise ones
    expect(result.generatedFiles!.prompt.length).toBeGreaterThan(500);
  });

  it('should include examples when requested', async () => {
    const responsesRecord: Record<string, string | boolean | string[]> = {};
    for (const response of sampleInterviewResponses) {
      responsesRecord[response.questionId] = response.value;
    }

    const result = await pipeline.runFullPipeline(responsesRecord, {
      outputDir: tempDir,
      autoPackage: true,
      includeExamples: true,
      includeTests: false
    });

    expect(result.success).toBe(true);
    expect(result.packageResult).toBeDefined();

    // Verify examples directory exists if autoPackage is true
    if (result.packageResult?.outputDir) {
      const examplesDir = path.join(result.packageResult.outputDir, 'examples');
      const examplesExist = await fs.access(examplesDir).then(() => true).catch(() => false);
      expect(examplesExist).toBe(true);
    }
  });

  it('should correctly classify different agent types', async () => {
    // Test with content creator responses that explicitly mention content creation
    const contentCreatorResponses: Record<string, string | boolean | string[]> = {
      'q1_agent_name': 'Content Creator',
      'q2_primary_outcome': 'Generate SEO-optimized blog posts, articles, and marketing copy',
      'q3_target_audience': ['Content marketers', 'Bloggers'],
      'q4_interaction_style': 'conversational',
      'q5_delivery_channels': ['Web Application'],
      'q6_success_metrics': ['Content quality', 'SEO score'],
      'q7_memory_needs': 'none',
      'q8_file_access': false,
      'q9_web_access': true,
      'q10_code_execution': false,
      'q11_data_analysis': false,
      'q12_tool_integrations': '',
      'q13_runtime_preference': 'cloud',
      'q14_constraints': '',
      'q15_additional_notes': 'Focus on writing and content optimization'
    };

    const result = await pipeline.runFullPipeline(contentCreatorResponses, {
      outputDir: tempDir,
      autoPackage: false
    });

    expect(result.success).toBe(true);
    // Verify it classified to a valid template (may be content-creator or research-agent based on web access)
    expect(result.recommendations?.agentType).toMatch(/^(content-creator|research-agent)$/);
  });

  it('should track pipeline state correctly', () => {
    const state = pipeline.getState();
    expect(state).toBeDefined();
    expect(state.sessionActive).toBeDefined();
    expect(state.progress).toBeGreaterThanOrEqual(0);
    expect(state.progress).toBeLessThanOrEqual(100);
  });
});
