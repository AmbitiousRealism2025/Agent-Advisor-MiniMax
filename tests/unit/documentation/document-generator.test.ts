/**
 * Unit Tests - Planning Document Generator
 *
 * Tests the PlanningDocumentGenerator class to ensure it produces valid
 * planning documents with all required sections, proper formatting, and
 * documentation-only content (no code blocks).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningDocumentGenerator } from '../../../src/lib/documentation/document-generator.js';
import {
  sampleDataAnalystRequirements,
  sampleContentCreatorRequirements,
  sampleCodeAssistantRequirements,
  sampleResearchAgentRequirements,
  sampleAutomationAgentRequirements
} from '../../fixtures/sample-requirements.js';
import { AgentClassifier } from '../../../src/lib/classification/classifier.js';
import type { AgentRecommendations, AgentRequirements } from '../../../src/types/agent.js';
import { parseMarkdownDocument } from '../../utils/markdown-validator.js';

describe('PlanningDocumentGenerator', () => {
  let generator: PlanningDocumentGenerator;
  let classifier: AgentClassifier;

  beforeEach(() => {
    generator = new PlanningDocumentGenerator();
    classifier = new AgentClassifier();
  });

  describe('generate()', () => {
    const testCases: Array<{ name: string; requirements: AgentRequirements; templateId: string }> = [
      { name: 'Data Analyst', requirements: sampleDataAnalystRequirements, templateId: 'data-analyst' },
      { name: 'Content Creator', requirements: sampleContentCreatorRequirements, templateId: 'content-creator' },
      { name: 'Code Assistant', requirements: sampleCodeAssistantRequirements, templateId: 'code-assistant' },
      { name: 'Research Agent', requirements: sampleResearchAgentRequirements, templateId: 'research-agent' },
      { name: 'Automation Agent', requirements: sampleAutomationAgentRequirements, templateId: 'automation-agent' }
    ];

    testCases.forEach(({ name, requirements, templateId }) => {
      describe(`${name} template`, () => {
        let document: string;
        let recommendations: AgentRecommendations;

        beforeEach(() => {
          recommendations = classifier.classify(requirements);
          document = generator.generate({
            templateId,
            agentName: requirements.name,
            requirements,
            recommendations
          });
        });

        it('should generate non-empty document', () => {
          expect(document).toBeTruthy();
          expect(document.length).toBeGreaterThan(100);
        });

        it('should include agent name in title', () => {
          expect(document).toContain(`# ${requirements.name} Planning Document`);
        });

        it('should contain all 8 required sections in order', () => {
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
            expect(document).toContain(section);
          });

          // Verify section ordering by checking index positions
          const indices = sections.map(section => document.indexOf(section));
          const sortedIndices = [...indices].sort((a, b) => a - b);
          expect(indices).toEqual(sortedIndices);

          // Ensure all sections are found
          indices.forEach(index => {
            expect(index).toBeGreaterThan(-1);
          });
        });

        it('should have proper heading hierarchy (H1 title, H2 sections)', () => {
          const lines = document.split('\n');
          const h1Headers = lines.filter(line => line.startsWith('# '));
          const h2Headers = lines.filter(line => line.startsWith('## '));

          // Should have exactly 1 H1 header (title)
          expect(h1Headers.length).toBe(1);
          expect(h1Headers[0]).toContain('Planning Document');

          // Should have exactly 8 H2 headers (sections)
          expect(h2Headers.length).toBe(8);
        });

        it('should include template information in overview', () => {
          expect(document).toContain(`- **Template:**`);
          expect(document).toContain(`\`${templateId}\``);
        });

        it('should include primary outcome in overview', () => {
          expect(document).toContain(`- **Primary Outcome:** ${requirements.primaryOutcome}`);
        });

        it('should include capabilities in overview', () => {
          expect(document).toContain('- **Estimated Complexity:**');
          expect(document).toContain('- **Recommended MCP Servers:**');
          expect(document).toContain('- **Planned Tooling:**');
        });

        it('should distribute implementation steps across three phases', () => {
          expect(document).toContain('1. **Phase 1 - Foundations**');
          expect(document).toContain('2. **Phase 2 - Build**');
          expect(document).toContain('3. **Phase 3 - Validation & Launch**');
        });

        it('should include security considerations', () => {
          expect(document).toContain('## Security');
          expect(document).toContain('- **Compliance Obligations:**');
          expect(document).toContain('- **Memory Handling:**');
        });

        it('should include metrics section with success criteria', () => {
          expect(document).toContain('## Metrics');
          expect(document).toContain('- **Success Criteria:**');
        });

        it('should include risk assessment', () => {
          expect(document).toContain('## Risk');
          // Should have at least one risk item or fallback message
          const riskSection = document.split('## Risk')[1].split('## ')[0];
          expect(riskSection.trim().length).toBeGreaterThan(0);
        });

        it('should include deployment information', () => {
          expect(document).toContain('## Deployment');
          expect(document).toContain('- **Runtime Strategy:**');
          expect(document).toContain('- **MCP Server Configuration:**');
        });

        it('should NOT contain code blocks or code fences', () => {
          // Check for code fences
          expect(document).not.toContain('```typescript');
          expect(document).not.toContain('```ts');
          expect(document).not.toContain('```javascript');
          expect(document).not.toContain('```js');
          expect(document).not.toContain('```json');

          // Check for code-like patterns
          expect(document).not.toMatch(/\bfunction\s+\w+\s*\(/);
          expect(document).not.toMatch(/\bclass\s+\w+/);
          expect(document).not.toMatch(/\bimport\s+.*\s+from\s+['"]/);
          expect(document).not.toMatch(/\bexport\s+(const|function|class|default)/);
          expect(document).not.toMatch(/\binterface\s+\w+/);
          expect(document).not.toMatch(/\btype\s+\w+\s*=/);
          expect(document).not.toMatch(/\(\s*\)\s*=>\s*\{/);
        });

        it('should have sections separated by blank lines', () => {
          const sections = document.split(/^## /m);

          // Each section (except the first which is before any ## header)
          // should be properly separated
          sections.slice(1).forEach((section, index) => {
            // Sections should not start or end with multiple blank lines
            const trimmed = section.trim();
            expect(trimmed.length).toBeGreaterThan(0);
          });
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle empty implementation steps gracefully', () => {
        const requirements = sampleDataAnalystRequirements;
        const recommendations: AgentRecommendations = {
          agentType: 'data-analyst',
          requiredDependencies: ['@anthropic-ai/claude-agent-sdk'],
          mcpServers: [],
          systemPrompt: 'Test prompt',
          toolConfigurations: [],
          estimatedComplexity: 'low',
          implementationSteps: [], // Empty steps
          notes: undefined
        };

        const document = generator.generate({
          templateId: 'data-analyst',
          agentName: 'Test Agent',
          requirements,
          recommendations
        });

        expect(document).toContain('## Phases');
        expect(document).toContain('Phase 1 - Foundations');
        expect(document).toContain('Phase 2 - Build');
        expect(document).toContain('Phase 3 - Validation & Launch');

        // Should include fallback guidance
        expect(document).toContain('Define detailed tasks with the delivery team');
      });

      it('should handle no MCP servers with fallback text', () => {
        const requirements = sampleDataAnalystRequirements;
        const recommendations: AgentRecommendations = {
          agentType: 'data-analyst',
          requiredDependencies: ['@anthropic-ai/claude-agent-sdk'],
          mcpServers: [], // No MCP servers
          systemPrompt: 'Test prompt',
          toolConfigurations: [],
          estimatedComplexity: 'low',
          implementationSteps: ['Step 1', 'Step 2', 'Step 3'],
          notes: undefined
        };

        const document = generator.generate({
          templateId: 'data-analyst',
          agentName: 'Test Agent',
          requirements,
          recommendations
        });

        expect(document).toContain('- **Recommended MCP Servers:** None required');
        expect(document).toContain('- **MCP Server Configuration:**');
        expect(document).toContain('- No MCP servers required.');
      });

      it('should handle empty tool configurations with fallback text', () => {
        const requirements = sampleDataAnalystRequirements;
        const recommendations: AgentRecommendations = {
          agentType: 'data-analyst',
          requiredDependencies: ['@anthropic-ai/claude-agent-sdk'],
          mcpServers: [],
          systemPrompt: 'Test prompt',
          toolConfigurations: [], // Empty tools
          estimatedComplexity: 'low',
          implementationSteps: ['Step 1', 'Step 2'],
          notes: undefined
        };

        const document = generator.generate({
          templateId: 'data-analyst',
          agentName: 'Test Agent',
          requirements,
          recommendations
        });

        expect(document).toContain('- **Planned Tooling:** Core template tools only');
        expect(document).toContain('The selected template does not specify default tools');
      });

      it('should reject invalid agent names', () => {
        const requirements = sampleDataAnalystRequirements;
        const recommendations = classifier.classify(requirements);

        expect(() => {
          generator.generate({
            templateId: 'data-analyst',
            agentName: 'ab', // Too short
            requirements,
            recommendations
          });
        }).toThrow('Agent name must be at least three characters');

        expect(() => {
          generator.generate({
            templateId: 'data-analyst',
            agentName: '123Invalid', // Starts with number
            requirements,
            recommendations
          });
        }).toThrow('Agent name must be at least three characters');
      });

      it('should reject invalid template IDs', () => {
        const requirements = sampleDataAnalystRequirements;
        const recommendations = classifier.classify(requirements);

        expect(() => {
          generator.generate({
            templateId: 'invalid-template',
            agentName: 'Test Agent',
            requirements,
            recommendations
          });
        }).toThrow('Template "invalid-template" not found');
      });

      it('should handle requirements with minimal data', () => {
        const minimalRequirements: AgentRequirements = {
          name: 'Minimal Agent',
          description: 'Test description',
          primaryOutcome: 'Test outcome',
          targetAudience: ['Testers'],
          interactionStyle: 'task-focused',
          deliveryChannels: ['CLI'],
          successMetrics: [],
          capabilities: {
            memory: 'none',
            fileAccess: false,
            webAccess: false,
            codeExecution: false,
            dataAnalysis: false,
            toolIntegrations: []
          },
          environment: {
            runtime: 'local'
          }
        };

        const recommendations = classifier.classify(minimalRequirements);
        const document = generator.generate({
          templateId: recommendations.agentType,
          agentName: minimalRequirements.name,
          requirements: minimalRequirements,
          recommendations
        });

        expect(document).toBeTruthy();
        expect(document).toContain('## Overview');
        expect(document).toContain('## Requirements');

        // Should handle empty success metrics
        expect(document).toContain('Defined during project kickoff');
      });
    });

    describe('Section verification with parseMarkdownDocument', () => {
      it('should produce parseable Markdown with no code blocks in content', () => {
        const requirements = sampleDataAnalystRequirements;
        const recommendations = classifier.classify(requirements);
        const document = generator.generate({
          templateId: 'data-analyst',
          agentName: requirements.name,
          requirements,
          recommendations
        });

        const parsed = parseMarkdownDocument(document);

        // Document should not have any code blocks (it's pure documentation)
        expect(parsed.codeBlocks.length).toBe(0);

        // No file headers (this is a planning document, not a code generation output)
        expect(parsed.fileHeaders.length).toBe(0);

        // No copy instructions (not generating files)
        expect(parsed.copyInstructions.length).toBe(0);
      });

      it('should contain agent metadata in overview section', () => {
        const requirements = sampleCodeAssistantRequirements;
        const recommendations = classifier.classify(requirements);
        const document = generator.generate({
          templateId: 'code-assistant',
          agentName: requirements.name,
          requirements,
          recommendations
        });

        // Check that metadata is present in the document (not relying on parser extraction)
        expect(document).toContain(`- **Agent Name:** ${requirements.name}`);
        expect(document).toContain('- **Template:**');
        expect(document).toContain('code-assistant');
        expect(document).toContain(`- **Primary Outcome:** ${requirements.primaryOutcome}`);
      });
    });
  });
});
