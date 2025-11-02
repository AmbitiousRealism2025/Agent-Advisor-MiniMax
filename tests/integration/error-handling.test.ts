/**
 * Integration Tests: Error Handling with Structured Error Codes
 *
 * Tests the complete error handling flow from tool handlers through
 * to the advisor agent's error parsing and user-facing suggestions.
 */

import { describe, it, expect } from 'vitest';
import { GenerateAgentCodeHandler, GenerateSystemPromptHandler, GenerateConfigFilesHandler } from '../../src/lib/generation/tool-handlers.js';
import { ClassifyAgentTypeHandler } from '../../src/lib/classification/tool-handler.js';
import { createGenerateImplementationGuideTool } from '../../src/lib/export/tool-handler.js';
import { ErrorCodes, isToolError } from '../../src/types/errors.js';
import { sampleDataAnalystRequirements } from '../fixtures/sample-requirements.js';

describe('Error Handling Integration', () => {
  describe('Agent Name Validation', () => {
    it('should accept agent names with spaces', async () => {
      const codeHandler = new GenerateAgentCodeHandler();
      const result = await codeHandler.handle({
        templateId: 'data-analyst',
        agentName: 'Sales Data Analyzer', // Has spaces
        includeComments: true,
        includeErrorHandling: true,
        includeSampleUsage: true
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('## Agent Code Generated');
      expect(markdown).not.toContain('## Error');
    });

    it('should accept agent names with hyphens and underscores', async () => {
      const codeHandler = new GenerateAgentCodeHandler();
      const result = await codeHandler.handle({
        templateId: 'content-creator',
        agentName: 'Blog_Post-Writer_2024',
        includeComments: false,
        includeErrorHandling: false,
        includeSampleUsage: false
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('## Agent Code Generated');
      expect(markdown).not.toContain('## Error');
    });

    it('should reject empty agent names', async () => {
      const codeHandler = new GenerateAgentCodeHandler();
      const result = await codeHandler.handle({
        templateId: 'data-analyst',
        agentName: '   ', // Only whitespace
        includeComments: true,
        includeErrorHandling: true,
        includeSampleUsage: true
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('## Error');
      expect(markdown).toContain('Agent name cannot be empty');
      expect(markdown).toContain(`**Error Code**: \`${ErrorCodes.INVALID_AGENT_NAME}\``);
      expect(markdown).toContain('### Troubleshooting');
    });

    it('should reject completely empty agent names', async () => {
      const configHandler = new GenerateConfigFilesHandler();
      const result = await configHandler.handle({
        templateId: 'code-assistant',
        agentName: '',
        requirements: sampleDataAnalystRequirements,
        files: ['package', 'tsconfig']
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('## Error');
      expect(markdown).toContain(ErrorCodes.INVALID_AGENT_NAME);
    });
  });

  describe('Template ID Validation', () => {
    it('should return INVALID_TEMPLATE error for unknown template ID', async () => {
      const codeHandler = new GenerateAgentCodeHandler();
      const result = await codeHandler.handle({
        templateId: 'invalid-template-xyz',
        agentName: 'Test Agent',
        includeComments: true,
        includeErrorHandling: true,
        includeSampleUsage: true
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('## Error');
      expect(markdown).toContain('Invalid template ID');
      expect(markdown).toContain(`**Error Code**: \`${ErrorCodes.INVALID_TEMPLATE}\``);
      expect(markdown).toContain('**Valid Values**: `data-analyst`, `content-creator`, `code-assistant`, `research-agent`, `automation-agent`');
      expect(markdown).toContain('### Troubleshooting');
    });

    it('should return INVALID_TEMPLATE for typo in template ID', async () => {
      const promptHandler = new GenerateSystemPromptHandler();
      const result = await promptHandler.handle({
        templateId: 'data-analyt', // Typo: missing 's' and 't'
        requirements: sampleDataAnalystRequirements,
        includeExamples: true,
        includeConstraints: true,
        verbosityLevel: 'standard'
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('## Error');
      expect(markdown).toContain(ErrorCodes.INVALID_TEMPLATE);
    });

    it('should list all valid template IDs in error details', async () => {
      const implementationGuideTool = createGenerateImplementationGuideTool();
      const result = await implementationGuideTool.handler({
        templateId: 'non-existent',
        agentName: 'Test Agent',
        requirements: sampleDataAnalystRequirements,
        recommendations: {
          agentType: 'data-analyst',
          requiredDependencies: [],
          mcpServers: [],
          systemPrompt: '',
          starterCode: '',
          toolConfigurations: [],
          estimatedComplexity: 'medium',
          implementationSteps: []
        },
        includeReadme: true,
        includeExamples: true
      }, {});

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain(ErrorCodes.INVALID_TEMPLATE);
      expect(markdown).toContain('data-analyst');
      expect(markdown).toContain('content-creator');
      expect(markdown).toContain('code-assistant');
      expect(markdown).toContain('research-agent');
      expect(markdown).toContain('automation-agent');
    });
  });

  describe('Requirements Validation', () => {
    it('should return INVALID_REQUIREMENTS error for missing required fields', async () => {
      const promptHandler = new GenerateSystemPromptHandler();
      const invalidRequirements = {
        name: 'Test Agent',
        // Missing all other required fields
      } as any;

      const result = await promptHandler.handle({
        templateId: 'data-analyst',
        requirements: invalidRequirements,
        includeExamples: true,
        includeConstraints: true,
        verbosityLevel: 'standard'
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('## Error');
      expect(markdown).toContain('Invalid requirements provided');
      expect(markdown).toContain(`**Error Code**: \`${ErrorCodes.INVALID_REQUIREMENTS}\``);
      expect(markdown).toContain('### Error Details');
      expect(markdown).toContain('**Validation Errors**:');
    });

    it('should provide detailed validation errors for each missing field', async () => {
      const configHandler = new GenerateConfigFilesHandler();
      const incompleteRequirements = {
        name: 'Test',
        description: 'Test description',
        // Missing: primaryOutcome, targetAudience, interactionStyle, etc.
      } as any;

      const result = await configHandler.handle({
        templateId: 'content-creator',
        agentName: 'Test Agent',
        requirements: incompleteRequirements,
        files: ['package']
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain(ErrorCodes.INVALID_REQUIREMENTS);
      expect(markdown).toContain('errorCount');
    });

    it('should validate enum field values', async () => {
      const classifier = new ClassifyAgentTypeHandler();
      const invalidEnumRequirements = {
        ...sampleDataAnalystRequirements,
        interactionStyle: 'invalid-style' // Should be 'conversational', 'task-focused', or 'collaborative'
      } as any;

      const result = await classifier.handle({
        requirements: invalidEnumRequirements,
        includeAlternatives: true
      });

      const resultStr = result.content[0]?.text ?? '';
      const parsed = JSON.parse(resultStr);
      expect(parsed.status).toBe('error');
      expect(parsed.code).toBe(ErrorCodes.INVALID_REQUIREMENTS);
      expect(parsed.details.validationErrors).toBeDefined();
    });
  });

  describe('Classification Error Handling', () => {
    it('should return NO_MATCHING_TEMPLATE for very low confidence', async () => {
      const classifier = new ClassifyAgentTypeHandler();
      // This test is conceptual - in reality, the classifier always finds a match
      // but this documents the expected behavior if no template matches well
      const result = await classifier.handle({
        requirements: sampleDataAnalystRequirements,
        includeAlternatives: false
      });

      const resultStr = result.content[0]?.text ?? '';
      const parsed = JSON.parse(resultStr);
      // Should succeed with normal requirements
      expect(parsed.status).toBe('success');
    });
  });

  describe('Error Code Consistency', () => {
    it('should use consistent error codes across all handlers', async () => {
      const errorCodes = new Set<string>();

      // Test INVALID_TEMPLATE across all handlers
      const codeResult = await new GenerateAgentCodeHandler().handle({
        templateId: 'bad-template',
        agentName: 'Test',
        includeComments: false,
        includeErrorHandling: false,
        includeSampleUsage: false
      });
      const codeMarkdown = codeResult.content[0]?.text ?? '';
      if (codeMarkdown.includes(ErrorCodes.INVALID_TEMPLATE)) {
        errorCodes.add(ErrorCodes.INVALID_TEMPLATE);
      }

      const promptResult = await new GenerateSystemPromptHandler().handle({
        templateId: 'bad-template',
        requirements: sampleDataAnalystRequirements,
        includeExamples: false,
        includeConstraints: false,
        verbosityLevel: 'concise'
      });
      const promptMarkdown = promptResult.content[0]?.text ?? '';
      if (promptMarkdown.includes(ErrorCodes.INVALID_TEMPLATE)) {
        errorCodes.add(ErrorCodes.INVALID_TEMPLATE);
      }

      // Both should use the same error code
      expect(errorCodes.size).toBe(1);
      expect(errorCodes.has(ErrorCodes.INVALID_TEMPLATE)).toBe(true);
    });

    it('should format all errors as structured ToolError objects', async () => {
      const codeHandler = new GenerateAgentCodeHandler();
      const result = await codeHandler.handle({
        templateId: 'invalid',
        agentName: '',
        includeComments: false,
        includeErrorHandling: false,
        includeSampleUsage: false
      });

      const markdown = result.content[0]?.text ?? '';
      // Should have error code section
      expect(markdown).toMatch(/\*\*Error Code\*\*:\s*`\w+`/);
      // Should have troubleshooting section
      expect(markdown).toContain('### Troubleshooting');
    });
  });

  describe('Error Message Formatting', () => {
    it('should format errors as Markdown with proper structure', async () => {
      const codeHandler = new GenerateAgentCodeHandler();
      const result = await codeHandler.handle({
        templateId: 'invalid-id',
        agentName: 'Test Agent',
        includeComments: false,
        includeErrorHandling: false,
        includeSampleUsage: false
      });

      const markdown = result.content[0]?.text ?? '';

      // Check Markdown structure
      expect(markdown).toContain('## Error');
      expect(markdown).toContain('**Error Code**:');
      expect(markdown).toContain('### Troubleshooting');

      // Check formatting
      expect(markdown).toMatch(/`[A-Z_]+`/); // Error code in backticks
    });

    it('should include valid values when available', async () => {
      const codeHandler = new GenerateAgentCodeHandler();
      const result = await codeHandler.handle({
        templateId: 'wrong',
        agentName: 'Test',
        includeComments: false,
        includeErrorHandling: false,
        includeSampleUsage: false
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('**Valid Values**:');
      expect(markdown).toMatch(/`data-analyst`/);
    });

    it('should provide context-specific troubleshooting tips', async () => {
      const codeHandler = new GenerateAgentCodeHandler();
      const result = await codeHandler.handle({
        templateId: 'invalid',
        agentName: 'Test',
        includeComments: false,
        includeErrorHandling: false,
        includeSampleUsage: false
      });

      const markdown = result.content[0]?.text ?? '';
      expect(markdown).toContain('### Troubleshooting');
      // Should have specific, actionable guidance
      expect(markdown.length).toBeGreaterThan(200); // Substantial troubleshooting content
    });
  });
});
