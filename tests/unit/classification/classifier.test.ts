/**
 * Unit Tests - Agent Classifier
 *
 * Tests template scoring, classification logic, and recommendation generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentClassifier } from '../../../src/lib/classification/classifier.js';
import { getTemplateById } from '../../../src/templates/index.js';
import {
  sampleDataAnalystRequirements,
  sampleContentCreatorRequirements,
  sampleCodeAssistantRequirements,
  sampleResearchAgentRequirements,
  sampleAutomationAgentRequirements
} from '../../fixtures/sample-requirements.js';

describe('AgentClassifier', () => {
  let classifier: AgentClassifier;

  beforeEach(() => {
    classifier = new AgentClassifier();
  });

  describe('scoreTemplate', () => {
    it('should score data analyst template high for data analysis requirements', () => {
      const template = getTemplateById('data-analyst')!;
      const score = classifier.scoreTemplate(template, sampleDataAnalystRequirements);
      expect(score.score).toBeGreaterThan(70);
      expect(score.templateId).toBe('data-analyst');
    });

    it('should score content creator template high for content requirements', () => {
      const template = getTemplateById('content-creator')!;
      const score = classifier.scoreTemplate(template, sampleContentCreatorRequirements);
      expect(score.score).toBeGreaterThan(70);
    });

    it('should score code assistant template high for code requirements', () => {
      const template = getTemplateById('code-assistant')!;
      const score = classifier.scoreTemplate(template, sampleCodeAssistantRequirements);
      expect(score.score).toBeGreaterThan(70);
    });

    it('should score research agent template high for research requirements', () => {
      const template = getTemplateById('research-agent')!;
      const score = classifier.scoreTemplate(template, sampleResearchAgentRequirements);
      expect(score.score).toBeGreaterThan(70);
    });

    it('should score automation agent template high for automation requirements', () => {
      const template = getTemplateById('automation-agent')!;
      const score = classifier.scoreTemplate(template, sampleAutomationAgentRequirements);
      expect(score.score).toBeGreaterThan(70);
    });

    it('should include matched capabilities in score breakdown', () => {
      const template = getTemplateById('data-analyst')!;
      const score = classifier.scoreTemplate(template, sampleDataAnalystRequirements);
      expect(score.matchedCapabilities).toBeDefined();
      expect(score.matchedCapabilities.length).toBeGreaterThan(0);
      expect(score.matchedCapabilities).toContain('data-processing');
    });

    it('should include missing capabilities in score breakdown', () => {
      const template = getTemplateById('content-creator')!;
      const score = classifier.scoreTemplate(template, sampleDataAnalystRequirements);
      expect(score.missingCapabilities).toBeDefined();
    });

    it('should provide reasoning for score', () => {
      const template = getTemplateById('data-analyst')!;
      const score = classifier.scoreTemplate(template, sampleDataAnalystRequirements);
      expect(score.reasoning).toBeDefined();
      expect(score.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('scoreAllTemplates', () => {
    it('should return all 5 templates sorted by score', () => {
      const scores = classifier.scoreAllTemplates(sampleDataAnalystRequirements);
      expect(scores).toHaveLength(5);
      expect(scores.every(s => s.score !== undefined)).toBe(true);
    });

    it('should sort templates by score descending', () => {
      const scores = classifier.scoreAllTemplates(sampleDataAnalystRequirements);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i].score).toBeGreaterThanOrEqual(scores[i + 1].score);
      }
    });

    it('should score all templates between 0 and 100', () => {
      const scores = classifier.scoreAllTemplates(sampleDataAnalystRequirements);
      scores.forEach(score => {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('classify', () => {
    it('should classify data analyst requirements correctly', () => {
      const recommendations = classifier.classify(sampleDataAnalystRequirements);
      expect(recommendations.agentType).toBe('data-analyst');
    });

    it('should classify content creator requirements correctly', () => {
      const recommendations = classifier.classify(sampleContentCreatorRequirements);
      expect(recommendations.agentType).toBe('content-creator');
    });

    it('should classify code assistant requirements correctly', () => {
      const recommendations = classifier.classify(sampleCodeAssistantRequirements);
      expect(recommendations.agentType).toBe('code-assistant');
    });

    it('should classify research agent requirements correctly', () => {
      const recommendations = classifier.classify(sampleResearchAgentRequirements);
      expect(recommendations.agentType).toBe('research-agent');
    });

    it('should classify automation agent requirements correctly', () => {
      const recommendations = classifier.classify(sampleAutomationAgentRequirements);
      expect(recommendations.agentType).toBe('automation-agent');
    });

    it('should return complete recommendations', () => {
      const recommendations = classifier.classify(sampleDataAnalystRequirements);
      expect(recommendations.agentType).toBeDefined();
      expect(recommendations.requiredDependencies).toBeDefined();
      expect(recommendations.mcpServers).toBeDefined();
      expect(recommendations.systemPrompt).toBeDefined();
      expect(recommendations.estimatedComplexity).toBeDefined();
      expect(recommendations.implementationSteps).toBeDefined();
      expect(recommendations.toolConfigurations).toBeDefined();
      expect(recommendations.starterCode).toBeDefined();
    });

    it('should customize system prompt with requirements', () => {
      const recommendations = classifier.classify(sampleDataAnalystRequirements);
      expect(recommendations.systemPrompt).toContain(sampleDataAnalystRequirements.name);
      expect(recommendations.systemPrompt).toContain(sampleDataAnalystRequirements.primaryOutcome);
    });

    it('should generate MCP servers based on capabilities', () => {
      const recommendations = classifier.classify(sampleDataAnalystRequirements);
      const serverNames = recommendations.mcpServers.map(s => s.name);
      expect(serverNames).toContain('filesystem');
    });

    it('should assess complexity correctly', () => {
      const simple = classifier.classify({
        ...sampleDataAnalystRequirements,
        capabilities: {
          ...sampleDataAnalystRequirements.capabilities,
          dataAnalysis: false,
          toolIntegrations: []
        }
      });
      expect(simple.estimatedComplexity).toBe('low');

      const complex = classifier.classify({
        ...sampleDataAnalystRequirements,
        capabilities: {
          ...sampleDataAnalystRequirements.capabilities,
          fileAccess: true,
          webAccess: true,
          codeExecution: true,
          dataAnalysis: true,
          memory: 'long-term',
          toolIntegrations: ['GitHub', 'Slack', 'PostgreSQL']
        }
      });
      expect(complex.estimatedComplexity).toBe('high');
    });

    it('should generate implementation steps', () => {
      const recommendations = classifier.classify(sampleDataAnalystRequirements);
      expect(recommendations.implementationSteps).toBeInstanceOf(Array);
      expect(recommendations.implementationSteps.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('generateMCPServers', () => {
    it('should recommend filesystem server for file access', () => {
      const template = getTemplateById('data-analyst')!;
      const servers = classifier.generateMCPServers({
        ...sampleDataAnalystRequirements,
        capabilities: {
          ...sampleDataAnalystRequirements.capabilities,
          fileAccess: true
        }
      }, template);
      const serverNames = servers.map(s => s.name);
      expect(serverNames).toContain('filesystem');
    });

    it('should recommend web-fetch server for web access', () => {
      const template = getTemplateById('research-agent')!;
      const servers = classifier.generateMCPServers({
        ...sampleResearchAgentRequirements,
        capabilities: {
          ...sampleResearchAgentRequirements.capabilities,
          webAccess: true
        }
      }, template);
      const serverNames = servers.map(s => s.name);
      expect(serverNames).toContain('web-fetch');
    });

    it('should recommend data-tools for data analysis', () => {
      const template = getTemplateById('data-analyst')!;
      const servers = classifier.generateMCPServers({
        ...sampleDataAnalystRequirements,
        capabilities: {
          ...sampleDataAnalystRequirements.capabilities,
          dataAnalysis: true
        }
      }, template);
      const serverNames = servers.map(s => s.name);
      expect(serverNames).toContain('data-tools');
    });

    it('should recommend memory server for long-term memory', () => {
      const template = getTemplateById('research-agent')!;
      const servers = classifier.generateMCPServers({
        ...sampleResearchAgentRequirements,
        capabilities: {
          ...sampleResearchAgentRequirements.capabilities,
          memory: 'long-term'
        }
      }, template);
      const serverNames = servers.map(s => s.name);
      expect(serverNames).toContain('memory');
    });

    it('should return empty array when no special capabilities', () => {
      const template = getTemplateById('data-analyst')!;
      const servers = classifier.generateMCPServers({
        ...sampleDataAnalystRequirements,
        capabilities: {
          memory: 'none',
          fileAccess: false,
          webAccess: false,
          codeExecution: false,
          dataAnalysis: false,
          toolIntegrations: []
        }
      }, template);
      expect(servers).toEqual([]);
    });
  });

  describe('assessComplexity', () => {
    it('should assess low complexity for simple agent', () => {
      const template = getTemplateById('data-analyst')!;
      const complexity = classifier.assessComplexity({
        ...sampleDataAnalystRequirements,
        capabilities: {
          memory: 'none',
          fileAccess: true,
          webAccess: false,
          codeExecution: false,
          dataAnalysis: false,
          toolIntegrations: []
        }
      }, template);
      expect(complexity).toBe('low');
    });

    it('should assess medium complexity for moderate agent', () => {
      const template = getTemplateById('data-analyst')!;
      const complexity = classifier.assessComplexity(sampleDataAnalystRequirements, template);
      expect(complexity).toBe('medium');
    });

    it('should assess high complexity for complex agent', () => {
      const template = getTemplateById('automation-agent')!;
      const complexity = classifier.assessComplexity({
        ...sampleAutomationAgentRequirements,
        capabilities: {
          memory: 'long-term',
          fileAccess: true,
          webAccess: true,
          codeExecution: true,
          dataAnalysis: true,
          toolIntegrations: ['GitHub', 'Slack', 'PostgreSQL', 'Redis', 'Kafka']
        }
      }, template);
      expect(complexity).toBe('high');
    });
  });
});
