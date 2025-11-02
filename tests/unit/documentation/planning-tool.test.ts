/**
 * Unit Tests - Planning Document Tool Handler
 *
 * Tests the createGeneratePlanningDocumentTool function to ensure proper
 * tool configuration, input validation, Markdown-wrapped output, and
 * error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createGeneratePlanningDocumentTool } from '../../../src/lib/documentation/tool-handler.js';
import {
  sampleDataAnalystRequirements,
  sampleContentCreatorRequirements,
  sampleCodeAssistantRequirements,
  sampleResearchAgentRequirements,
  sampleAutomationAgentRequirements
} from '../../fixtures/sample-requirements.js';
import { AgentClassifier } from '../../../src/lib/classification/classifier.js';
import { parseMarkdownDocument } from '../../utils/markdown-validator.js';

describe('createGeneratePlanningDocumentTool', () => {
  let tool: ReturnType<typeof createGeneratePlanningDocumentTool>;
  let classifier: AgentClassifier;

  beforeEach(() => {
    tool = createGeneratePlanningDocumentTool();
    classifier = new AgentClassifier();
  });

  describe('Tool configuration', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('generate_planning_document');
    });

    it('should have descriptive tool description', () => {
      expect(tool.description).toContain('planning document');
      expect(tool.description).toContain('Markdown');
      expect(tool.description.length).toBeGreaterThan(50);
    });

    it('should be a valid tool with handler', () => {
      expect(tool).toBeDefined();
      expect(tool.handler).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    });
  });

  describe('Input validation', () => {
    it('should reject missing templateId', async () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      const result = await tool.handler({
        // @ts-expect-error - Testing missing field
        agentName: 'Test Agent',
        requirements,
        recommendations
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      // Should return error in Markdown format
      expect(text).toContain('## Error');
      expect(text).toContain('VALIDATION_ERROR');
      expect(text).toMatch(/templateId|required/i);
    });

    it('should reject missing agentName', async () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      const result = await tool.handler({
        templateId: 'data-analyst',
        // @ts-expect-error - Testing missing field
        requirements,
        recommendations
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      expect(text).toContain('## Error');
      expect(text).toContain('VALIDATION_ERROR');
      expect(text).toMatch(/agentName|required/i);
    });

    it('should reject missing requirements', async () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      const result = await tool.handler({
        templateId: 'data-analyst',
        agentName: 'Test Agent',
        // @ts-expect-error - Testing missing field
        recommendations
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      expect(text).toContain('## Error');
      expect(text).toContain('VALIDATION_ERROR');
      expect(text).toMatch(/requirements|required/i);
    });

    it('should reject missing recommendations', async () => {
      const requirements = sampleDataAnalystRequirements;

      const result = await tool.handler({
        templateId: 'data-analyst',
        agentName: 'Test Agent',
        requirements
        // @ts-expect-error - Testing missing field
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      expect(text).toContain('## Error');
      expect(text).toContain('VALIDATION_ERROR');
      expect(text).toMatch(/recommendations|required/i);
    });

    it('should reject invalid templateId', async () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      const result = await tool.handler({
        templateId: 'invalid-template-id',
        agentName: 'Test Agent',
        requirements,
        recommendations
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      expect(text).toContain('## Error');
      expect(text).toContain('TEMPLATE_NOT_FOUND');
      expect(text).toContain('invalid-template-id');
    });

    it('should reject invalid template ID even if legacy code template exists', async () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      // Test with a template ID that might exist in legacy code templates but not document templates
      const result = await tool.handler({
        templateId: 'legacy-deprecated-template',
        agentName: 'Test Agent',
        requirements,
        recommendations
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      expect(text).toContain('## Error');
      expect(text).toContain('TEMPLATE_NOT_FOUND');
      expect(text).toContain('legacy-deprecated-template');
      expect(text).toContain('document templates');
    });

    it('should reject invalid agentName (too short)', async () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      const result = await tool.handler({
        templateId: 'data-analyst',
        agentName: 'ab', // Too short
        requirements,
        recommendations
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      expect(text).toContain('## Error');
      expect(text).toContain('INVALID_AGENT_NAME');
      expect(text).toContain('at least three characters');
    });

    it('should provide validation errors with field paths', async () => {
      const result = await tool.handler({
        templateId: '',
        agentName: '',
        // @ts-expect-error - Testing invalid input
        requirements: {},
        recommendations: {}
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      expect(text).toContain('## Error');
      expect(text).toContain('VALIDATION_ERROR');
      // Should contain structured error information
      expect(text).toContain('Invalid generate_planning_document parameters');
    });
  });

  describe('Successful generation for all templates', () => {
    const testCases = [
      { name: 'Data Analyst', requirements: sampleDataAnalystRequirements, templateId: 'data-analyst' },
      { name: 'Content Creator', requirements: sampleContentCreatorRequirements, templateId: 'content-creator' },
      { name: 'Code Assistant', requirements: sampleCodeAssistantRequirements, templateId: 'code-assistant' },
      { name: 'Research Agent', requirements: sampleResearchAgentRequirements, templateId: 'research-agent' },
      { name: 'Automation Agent', requirements: sampleAutomationAgentRequirements, templateId: 'automation-agent' }
    ];

    testCases.forEach(({ name, requirements, templateId }) => {
      describe(name, () => {
        it('should generate valid planning document', async () => {
          const recommendations = classifier.classify(requirements);

          const result = await tool.handler({
            templateId,
            agentName: requirements.name,
            requirements,
            recommendations
          });

          expect(result.content).toBeDefined();
          expect(result.content.length).toBeGreaterThan(0);
          expect(result.content[0].type).toBe('text');
          const text = result.content[0].text;

          // Should not be an error
          expect(text).not.toContain('## Error');

          // Should be non-empty
          expect(text.length).toBeGreaterThan(100);
        });

        it('should have Markdown-wrapped output with file header', async () => {
          const recommendations = classifier.classify(requirements);

          const result = await tool.handler({
            templateId,
            agentName: requirements.name,
            requirements,
            recommendations
          });

          const text = result.content[0].text;

          // Should have planning document header
          expect(text).toContain('## Planning Document');

          // Should have file header
          expect(text).toContain('### File: `docs/planning.md`');

          // Should have markdown code fence
          expect(text).toContain('```markdown');

          // Should have closing fence
          const fences = text.match(/```/g);
          expect(fences).toBeDefined();
          expect(fences!.length).toBeGreaterThanOrEqual(2); // Opening and closing
        });

        it('should have copy instructions', async () => {
          const recommendations = classifier.classify(requirements);

          const result = await tool.handler({
            templateId,
            agentName: requirements.name,
            requirements,
            recommendations
          });

          const text = result.content[0].text;

          expect(text).toContain('**To use**:');
          expect(text).toContain('Copy the above Markdown');
          expect(text).toContain('docs/planning.md');
        });

        it('should have next steps section', async () => {
          const recommendations = classifier.classify(requirements);

          const result = await tool.handler({
            templateId,
            agentName: requirements.name,
            requirements,
            recommendations
          });

          const text = result.content[0].text;

          expect(text).toContain('## Next Steps');
          expect(text).toMatch(/1\.\s+Review/);
          expect(text).toMatch(/2\.\s+Confirm/);
          expect(text).toMatch(/3\.\s+Begin/);
        });

        it('should contain all 8 sections inside the markdown fence', async () => {
          const recommendations = classifier.classify(requirements);

          const result = await tool.handler({
            templateId,
            agentName: requirements.name,
            requirements,
            recommendations
          });

          const text = result.content[0].text;

          // Extract the content inside the markdown fence
          const fenceMatch = text.match(/```markdown\n([\s\S]*?)\n```/);
          expect(fenceMatch).toBeDefined();

          const documentContent = fenceMatch![1];

          // Verify all 8 sections exist
          const sections = [
            '## Overview',
            '## Requirements',
            '## Architecture',
            '## Phases',
            '## Security',
            '## Metrics',
            '## Risk',
            '## Deployment'
          ];

          sections.forEach(section => {
            expect(documentContent).toContain(section);
          });
        });

        it('should NOT contain code blocks within the planning document', async () => {
          const recommendations = classifier.classify(requirements);

          const result = await tool.handler({
            templateId,
            agentName: requirements.name,
            requirements,
            recommendations
          });

          const text = result.content[0].text;

          // Extract the planning document content (inside the markdown fence)
          const fenceMatch = text.match(/```markdown\n([\s\S]*?)\n```/);
          expect(fenceMatch).toBeDefined();

          const documentContent = fenceMatch![1];

          // Document content should not have nested code fences
          expect(documentContent).not.toContain('```typescript');
          expect(documentContent).not.toContain('```ts');
          expect(documentContent).not.toContain('```javascript');
          expect(documentContent).not.toContain('```js');
          expect(documentContent).not.toContain('```json');

          // Should not have code-like patterns
          expect(documentContent).not.toMatch(/\bfunction\s+\w+\s*\(/);
          expect(documentContent).not.toMatch(/\bclass\s+\w+\s*\{/);
          expect(documentContent).not.toMatch(/\bimport\s+.*\s+from\s+['"]/);
          expect(documentContent).not.toMatch(/\bexport\s+(const|function|class|default)/);
          expect(documentContent).not.toMatch(/\binterface\s+\w+\s*\{/);
          expect(documentContent).not.toMatch(/\btype\s+\w+\s*=/);
          expect(documentContent).not.toMatch(/\(\s*\)\s*=>\s*\{/);
        });
      });
    });
  });

  describe('Error handling and formatting', () => {
    it('should format validation errors as Markdown', async () => {
      const result = await tool.handler({
        templateId: '',
        agentName: '',
        // @ts-expect-error - Testing invalid input
        requirements: null,
        recommendations: null
      });

      const text = result.content[0].text;

      // Should have proper Markdown error format
      expect(text).toMatch(/^## Error/m);
      expect(text).toContain('**Error Code**:');
      expect(text).toContain('VALIDATION_ERROR');
    });

    it('should format generation errors as Markdown', async () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      const result = await tool.handler({
        templateId: 'nonexistent-template',
        agentName: 'Test Agent',
        requirements,
        recommendations
      });

      const text = result.content[0].text;

      // Should have proper Markdown error format
      expect(text).toMatch(/^## Error/m);
      expect(text).toContain('**Error Code**:');
    });

    it('should include troubleshooting information in errors', async () => {
      const result = await tool.handler({
        templateId: 'invalid',
        agentName: 'Test',
        // @ts-expect-error - Testing invalid input
        requirements: {},
        recommendations: {}
      });

      const text = result.content[0].text;

      // Error messages should be actionable
      expect(text).toContain('Error');
      expect(text.length).toBeGreaterThan(50);
    });
  });

  describe('Output parsing verification', () => {
    it('should produce parseable Markdown wrapper', async () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      const result = await tool.handler({
        templateId: 'data-analyst',
        agentName: requirements.name,
        requirements,
        recommendations
      });

      const text = result.content[0].text;
      const parsed = parseMarkdownDocument(text);

      // The tool output should have one markdown code block (the planning doc)
      expect(parsed.codeBlocks.length).toBe(1);
      expect(parsed.codeBlocks[0].language).toBe('markdown');

      // Should have file header
      expect(parsed.fileHeaders.length).toBe(1);
      expect(parsed.fileHeaders[0]).toBe('docs/planning.md');

      // Should have copy instructions
      expect(parsed.copyInstructions.length).toBeGreaterThan(0);
    });

    it('should have Next Steps section in output', async () => {
      const requirements = sampleCodeAssistantRequirements;
      const recommendations = classifier.classify(requirements);

      const result = await tool.handler({
        templateId: 'code-assistant',
        agentName: requirements.name,
        requirements,
        recommendations
      });

      const text = result.content[0].text;

      // Check Next Steps section exists
      expect(text).toContain('## Next Steps');
      expect(text).toMatch(/1\.\s+Review/);
      expect(text).toMatch(/2\.\s+Confirm/);
      expect(text).toMatch(/3\.\s+Begin/);
    });
  });
});
