/**
 * E2E Tests - Documentation Workflow
 *
 * End-to-end tests that verify the complete documentation workflow:
 * Requirements → Classification → Planning Document Generation
 *
 * Tests the full pipeline for all 5 templates, ensuring proper integration
 * between classifier and document generator, and validating final output quality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentClassifier } from '../../src/lib/classification/classifier.js';
import { PlanningDocumentGenerator } from '../../src/lib/documentation/document-generator.js';
import {
  sampleDataAnalystRequirements,
  sampleContentCreatorRequirements,
  sampleCodeAssistantRequirements,
  sampleResearchAgentRequirements,
  sampleAutomationAgentRequirements,
  allSampleRequirements,
  expectedTemplateIds
} from '../fixtures/sample-requirements.js';
import { parseMarkdownDocument } from '../utils/markdown-validator.js';
import type { AgentRequirements, AgentRecommendations } from '../../src/types/agent.js';

describe('E2E - Documentation Generation Workflow', () => {
  let classifier: AgentClassifier;
  let generator: PlanningDocumentGenerator;

  beforeEach(() => {
    classifier = new AgentClassifier();
    generator = new PlanningDocumentGenerator();
  });

  describe('Complete workflow for all templates', () => {
    const testCases = [
      { name: 'Data Analyst', requirements: sampleDataAnalystRequirements, expectedTemplateId: 'data-analyst' },
      { name: 'Content Creator', requirements: sampleContentCreatorRequirements, expectedTemplateId: 'content-creator' },
      { name: 'Code Assistant', requirements: sampleCodeAssistantRequirements, expectedTemplateId: 'code-assistant' },
      { name: 'Research Agent', requirements: sampleResearchAgentRequirements, expectedTemplateId: 'research-agent' },
      { name: 'Automation Agent', requirements: sampleAutomationAgentRequirements, expectedTemplateId: 'automation-agent' }
    ];

    testCases.forEach(({ name, requirements, expectedTemplateId }) => {
      describe(name, () => {
        let recommendations: AgentRecommendations;
        let document: string;

        beforeEach(() => {
          // Step 1: Classify requirements
          recommendations = classifier.classify(requirements);

          // Step 2: Generate planning document
          document = generator.generate({
            templateId: recommendations.agentType,
            agentName: requirements.name,
            requirements,
            recommendations
          });
        });

        it('should complete full workflow: classify → generate', () => {
          // Verify classification succeeded
          expect(recommendations).toBeDefined();
          expect(recommendations.agentType).toBe(expectedTemplateId);

          // Verify document generation succeeded
          expect(document).toBeDefined();
          expect(document.length).toBeGreaterThan(100);
        });

        it('should produce non-empty document', () => {
          expect(document).toBeTruthy();
          expect(document.trim().length).toBeGreaterThan(0);
        });

        it('should have all 8 sections present in order', () => {
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

          // Check all sections exist
          sections.forEach(section => {
            expect(document).toContain(section);
          });

          // Verify section ordering
          const indices = sections.map(section => document.indexOf(section));
          const sortedIndices = [...indices].sort((a, b) => a - b);
          expect(indices).toEqual(sortedIndices);

          // All sections should be found (no -1 indices)
          indices.forEach(index => {
            expect(index).toBeGreaterThan(-1);
          });
        });

        it('should have proper heading hierarchy', () => {
          const lines = document.split('\n');

          // Count heading levels
          const h1Headers = lines.filter(line => /^#\s+[^#]/.test(line));
          const h2Headers = lines.filter(line => /^##\s+[^#]/.test(line));
          const h3Headers = lines.filter(line => /^###\s+[^#]/.test(line));

          // Should have exactly 1 H1 (title)
          expect(h1Headers.length).toBe(1);

          // Should have exactly 8 H2 (main sections)
          expect(h2Headers.length).toBe(8);

          // H3 headers should exist but vary by content (phases, etc.)
          expect(h3Headers.length).toBeGreaterThanOrEqual(0);

          // H1 should come before all H2s
          const h1Index = document.indexOf(h1Headers[0]);
          const firstH2Index = document.indexOf(h2Headers[0]);
          expect(h1Index).toBeLessThan(firstH2Index);
        });

        it('should NOT contain code blocks or code-like patterns', () => {
          // No code fences
          expect(document).not.toContain('```typescript');
          expect(document).not.toContain('```ts');
          expect(document).not.toContain('```javascript');
          expect(document).not.toContain('```js');
          expect(document).not.toContain('```json');

          // No code-like patterns
          expect(document).not.toMatch(/\bfunction\s+\w+\s*\(/);
          expect(document).not.toMatch(/\bclass\s+\w+\s*\{/);
          expect(document).not.toMatch(/\bimport\s+.*\s+from\s+['"]/);
          expect(document).not.toMatch(/\bexport\s+(const|function|class|default)/);
          expect(document).not.toMatch(/\binterface\s+\w+\s*\{/);
          expect(document).not.toMatch(/\btype\s+\w+\s*=/);
          expect(document).not.toMatch(/\(\s*\)\s*=>\s*\{/);

          // No TypeScript/JavaScript syntax patterns
          expect(document).not.toMatch(/:\s*(string|number|boolean|any|void)\s*[;,)]/);
          expect(document).not.toMatch(/const\s+\w+\s*[:=]/);
          expect(document).not.toMatch(/let\s+\w+\s*[:=]/);
          expect(document).not.toMatch(/var\s+\w+\s*[:=]/);
        });

        it('should include agent name and template information', () => {
          expect(document).toContain(requirements.name);
          expect(document).toContain('Planning Document');
          expect(document).toContain(`\`${expectedTemplateId}\``);
        });

        it('should include requirements data', () => {
          expect(document).toContain(requirements.primaryOutcome);
          expect(document).toContain(requirements.description);

          // Should include at least one target audience
          const audiences = requirements.targetAudience;
          const hasAudience = audiences.some(audience => document.includes(audience));
          expect(hasAudience).toBe(true);
        });

        it('should include classification recommendations', () => {
          // Should mention complexity
          expect(document).toContain(recommendations.estimatedComplexity);

          // Should include dependency information
          if (recommendations.requiredDependencies.length > 0) {
            expect(document).toContain('Dependencies');
          }

          // Should reference implementation steps (in phases)
          expect(document).toContain('Phase 1');
          expect(document).toContain('Phase 2');
          expect(document).toContain('Phase 3');
        });

        it('should have sections with substantive content', () => {
          // Extract each section and verify it has content
          const sectionPattern = /^## (\w+)/gm;
          const sections = document.match(sectionPattern);

          expect(sections).toBeDefined();
          expect(sections!.length).toBe(8);

          // Each section should have more than just the header
          sections!.forEach(sectionHeader => {
            const sectionStart = document.indexOf(sectionHeader);
            const nextSectionStart = document.indexOf('## ', sectionStart + 3);
            const sectionContent = nextSectionStart > -1
              ? document.substring(sectionStart, nextSectionStart)
              : document.substring(sectionStart);

            // Section should have more than just the header line
            const lines = sectionContent.trim().split('\n').filter(line => line.trim().length > 0);
            expect(lines.length).toBeGreaterThan(1);
          });
        });

        it('should parse as valid Markdown with no code blocks', () => {
          const parsed = parseMarkdownDocument(document);

          // Planning documents should not have code blocks
          expect(parsed.codeBlocks.length).toBe(0);

          // Should not have file headers (not generating files)
          expect(parsed.fileHeaders.length).toBe(0);

          // Should not have copy instructions (not outputting code)
          expect(parsed.copyInstructions.length).toBe(0);
        });

        it('should contain metadata in overview section', () => {
          // Verify metadata is present in document (not relying on parser extraction)
          expect(document).toContain(`- **Agent Name:** ${requirements.name}`);
          expect(document).toContain('- **Template:**');
          expect(document).toContain(expectedTemplateId);
          expect(document).toContain(`- **Primary Outcome:** ${requirements.primaryOutcome}`);
          expect(document).toContain('- **Estimated Complexity:**');
        });
      });
    });
  });

  describe('Cross-template consistency', () => {
    it('should generate documents for all templates with consistent structure', () => {
      const documents = allSampleRequirements.map((requirements, index) => {
        const recommendations = classifier.classify(requirements);
        return generator.generate({
          templateId: expectedTemplateIds[index],
          agentName: requirements.name,
          requirements,
          recommendations
        });
      });

      // All documents should exist
      expect(documents.length).toBe(5);
      documents.forEach(doc => {
        expect(doc).toBeTruthy();
        expect(doc.length).toBeGreaterThan(100);
      });

      // All should have the same 8 sections
      const expectedSections = [
        '## Overview',
        '## Requirements',
        '## Architecture',
        '## Phases',
        '## Security',
        '## Metrics',
        '## Risk',
        '## Deployment'
      ];

      documents.forEach((doc, index) => {
        expectedSections.forEach(section => {
          expect(doc).toContain(section);
        });

        // Verify H1 structure (exactly one H1 header)
        const h1Count = (doc.match(/^# [^#]/gm) || []).length;
        expect(h1Count).toBe(1);

        // Verify H2 structure (exactly 8 H2 headers)
        const h2Count = (doc.match(/^## [^#]/gm) || []).length;
        expect(h2Count).toBe(8);
      });
    });

    it('should generate unique content for each template', () => {
      const documents = allSampleRequirements.map((requirements, index) => {
        const recommendations = classifier.classify(requirements);
        return generator.generate({
          templateId: expectedTemplateIds[index],
          agentName: requirements.name,
          requirements,
          recommendations
        });
      });

      // Documents should not be identical
      const uniqueDocuments = new Set(documents);
      expect(uniqueDocuments.size).toBe(5);

      // Each should mention its specific template
      documents.forEach((doc, index) => {
        expect(doc).toContain(expectedTemplateIds[index]);
      });
    });
  });

  describe('Edge cases in E2E workflow', () => {
    it('should handle minimal requirements through full workflow', () => {
      const minimalRequirements: AgentRequirements = {
        name: 'Minimal Test Agent',
        description: 'Basic agent for testing',
        primaryOutcome: 'Test outcome',
        targetAudience: ['Testers'],
        interactionStyle: 'task-focused',
        deliveryChannels: ['CLI'],
        successMetrics: ['Basic metric'],
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

      // Should complete successfully
      expect(document).toBeTruthy();
      expect(document).toContain('## Overview');
      expect(document).toContain('## Requirements');

      // Should have all 8 sections
      const sections = ['Overview', 'Requirements', 'Architecture', 'Phases', 'Security', 'Metrics', 'Risk', 'Deployment'];
      sections.forEach(section => {
        expect(document).toContain(`## ${section}`);
      });
    });

    it('should handle requirements with complex capabilities', () => {
      const complexRequirements: AgentRequirements = {
        name: 'Complex Agent',
        description: 'Agent with all capabilities enabled',
        primaryOutcome: 'Comprehensive analysis and automation',
        targetAudience: ['Developers', 'Analysts', 'Operations'],
        interactionStyle: 'collaborative',
        deliveryChannels: ['CLI', 'API', 'Web Application'],
        successMetrics: ['Metric 1', 'Metric 2', 'Metric 3'],
        capabilities: {
          memory: 'long-term',
          fileAccess: true,
          webAccess: true,
          codeExecution: true,
          dataAnalysis: true,
          toolIntegrations: ['GitHub', 'Slack', 'Jira']
        },
        environment: {
          runtime: 'cloud',
          deploymentTargets: ['AWS', 'GCP'],
          complianceRequirements: ['SOC2', 'GDPR']
        },
        constraints: ['Budget constraint', 'Timeline constraint'],
        preferredTechnologies: ['TypeScript', 'Node.js', 'Docker']
      };

      const recommendations = classifier.classify(complexRequirements);
      const document = generator.generate({
        templateId: recommendations.agentType,
        agentName: complexRequirements.name,
        requirements: complexRequirements,
        recommendations
      });

      // Should handle complexity
      expect(document).toBeTruthy();
      expect(document.length).toBeGreaterThan(500);

      // Should reference integrations
      expect(document).toContain('GitHub');

      // Should mention compliance
      expect(document).toContain('SOC2');

      // Should reference constraints
      expect(document).toContain('constraint');

      // Should all have 8 sections
      const h2Headers = (document.match(/^## [^#]/gm) || []);
      expect(h2Headers.length).toBe(8);
    });
  });

  describe('Integration validation', () => {
    it('should use classifier output directly in generator without transformation', () => {
      const requirements = sampleDataAnalystRequirements;
      const recommendations = classifier.classify(requirements);

      // Generator should accept recommendations as-is
      expect(() => {
        generator.generate({
          templateId: recommendations.agentType,
          agentName: requirements.name,
          requirements,
          recommendations
        });
      }).not.toThrow();
    });

    it('should handle all recommendation fields in document', () => {
      const requirements = sampleCodeAssistantRequirements;
      const recommendations = classifier.classify(requirements);

      const document = generator.generate({
        templateId: recommendations.agentType,
        agentName: requirements.name,
        requirements,
        recommendations
      });

      // Should use agentType
      expect(document).toContain(recommendations.agentType);

      // Should reference estimatedComplexity
      expect(document).toContain(recommendations.estimatedComplexity);

      // Should incorporate implementationSteps (in phases)
      if (recommendations.implementationSteps.length > 0) {
        // At least one step should appear in the phases section
        const phasesSection = document.split('## Phases')[1].split('## ')[0];
        const hasStep = recommendations.implementationSteps.some(step => {
          const normalizedStep = step.replace(/^[0-9]+[.)]\s*/, '').trim();
          return phasesSection.includes(normalizedStep);
        });
        expect(hasStep).toBe(true);
      }

      // Should handle mcpServers
      if (recommendations.mcpServers.length > 0) {
        const firstServer = recommendations.mcpServers[0];
        expect(document).toContain(firstServer.name);
      }
    });
  });
});
