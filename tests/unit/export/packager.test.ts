/**
 * Unit Tests - Agent Packager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentPackager } from '../../../src/lib/export/packager.js';
import { AgentClassifier } from '../../../src/lib/classification/classifier.js';
import { sampleDataAnalystRequirements } from '../../fixtures/sample-requirements.js';
import { createTempDirectory, cleanupTempDirectory } from '../../utils/test-helpers.js';
import { promises as fs } from 'fs';
import path from 'path';
import { FileWriter } from '../../../src/lib/export/file-writer.js';

describe('AgentPackager', () => {
  let tempDir: string;
  let packager: AgentPackager;

  beforeEach(async () => {
    tempDir = await createTempDirectory('packager');
    packager = new AgentPackager();
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  it('should package complete agent project with all files', async () => {
    // Use sample requirements and real classifier
    const requirements = sampleDataAnalystRequirements;
    const classifier = new AgentClassifier();
    const recommendations = classifier.classify(requirements);

    const outputDir = path.join(tempDir, 'test-agent');
    const result = await packager.packageAgent({
      outputDir,
      agentName: 'Test Data Analyst',
      templateId: 'data-analyst',
      requirements,
      recommendations,
      includeDocumentation: true,
      includeExamples: true,
      includeTests: true
    });

    // Assert success
    expect(result.success).toBe(true);
    expect(result.outputDir).toBe(outputDir);

    // Assert manifest fields are populated
    expect(result.manifest.agentName).toBe('Test Data Analyst');
    expect(result.manifest.templateId).toBe('data-analyst');
    expect(result.manifest.version).toBe('1.0.0');
    expect(result.manifest.createdAt).toBeDefined();
    expect(result.manifest.dependencies.length).toBeGreaterThan(0);
    expect(result.manifest.files.length).toBeGreaterThan(0);

    // Verify output directory exists
    const dirExists = await fs.access(outputDir).then(() => true).catch(() => false);
    expect(dirExists).toBe(true);

    // Verify core files exist
    const expectedFiles = [
      'src/agent.ts',
      'src/system-prompt.ts',
      'package.json',
      '.env.example',
      'tsconfig.json',
      '.gitignore',
      'README.md',
      'docs/IMPLEMENTATION.md',
      'examples/example.ts',
      'tests/agent.test.ts',
      'agent-manifest.json'
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(outputDir, file);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }

    // Verify package.json content
    const packageJsonPath = path.join(outputDir, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    expect(packageJson.name).toBeDefined();
    expect(packageJson.dependencies).toBeDefined();

    // Verify manifest consistency
    expect(result.manifest.dependencies).toEqual(recommendations.requiredDependencies);
    expect(result.manifest.mcpServers).toEqual(recommendations.mcpServers.map(s => s.name));
  });

  it('should skip optional files when flags are false', async () => {
    const requirements = sampleDataAnalystRequirements;
    const classifier = new AgentClassifier();
    const recommendations = classifier.classify(requirements);

    const outputDir = path.join(tempDir, 'minimal-agent');
    const result = await packager.packageAgent({
      outputDir,
      agentName: 'Minimal Agent',
      templateId: 'data-analyst',
      requirements,
      recommendations,
      includeDocumentation: false,
      includeExamples: false,
      includeTests: false
    });

    expect(result.success).toBe(true);

    // Verify optional files are NOT created
    const docsPath = path.join(outputDir, 'docs/IMPLEMENTATION.md');
    const examplePath = path.join(outputDir, 'examples/example.ts');
    const testPath = path.join(outputDir, 'tests/agent.test.ts');

    const docsExists = await fs.access(docsPath).then(() => true).catch(() => false);
    const exampleExists = await fs.access(examplePath).then(() => true).catch(() => false);
    const testExists = await fs.access(testPath).then(() => true).catch(() => false);

    expect(docsExists).toBe(false);
    expect(exampleExists).toBe(false);
    expect(testExists).toBe(false);

    // Verify core files still exist
    const coreFiles = ['src/agent.ts', 'package.json', '.env.example'];
    for (const file of coreFiles) {
      const filePath = path.join(outputDir, file);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });

  it('should handle file write failures gracefully', async () => {
    const requirements = sampleDataAnalystRequirements;
    const classifier = new AgentClassifier();
    const recommendations = classifier.classify(requirements);

    // Spy on FileWriter.writeFile to simulate a failure
    const fileWriter = new FileWriter();
    const writeFileSpy = vi.spyOn(fileWriter, 'writeFile');

    // Make the first call fail (src/agent.ts)
    writeFileSpy.mockResolvedValueOnce({
      path: 'src/agent.ts',
      success: false,
      error: 'Simulated write failure'
    });

    // Let other calls proceed normally
    writeFileSpy.mockImplementation(async (path, content, options) => {
      return FileWriter.prototype.writeFile.call(fileWriter, path, content, options);
    });

    // Replace packager's fileWriter with our spy
    (packager as any).fileWriter = fileWriter;

    const outputDir = path.join(tempDir, 'failure-test');
    const result = await packager.packageAgent({
      outputDir,
      agentName: 'Failure Test Agent',
      templateId: 'data-analyst',
      requirements,
      recommendations,
      includeDocumentation: true,
      includeExamples: true,
      includeTests: false
    });

    // Should return success: false due to file failure
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors!.some(e => e.includes('Simulated write failure'))).toBe(true);

    // Other files should still succeed
    const successfulWrites = result.files.filter(f => f.success);
    expect(successfulWrites.length).toBeGreaterThan(0);

    writeFileSpy.mockRestore();
  });
});
