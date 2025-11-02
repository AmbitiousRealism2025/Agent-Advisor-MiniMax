/**
 * Test Fixtures - Sample Agent Requirements
 *
 * Provides pre-configured AgentRequirements objects for each of the 5 templates.
 * These fixtures are used across unit, integration, and E2E tests to ensure
 * consistent test data and validate template matching.
 */

import { AgentRequirements } from '../../src/types/agent.js';

/**
 * Sample requirements designed to match the Data Analyst template.
 * Tests data analysis, CSV processing, and statistical reporting capabilities.
 */
export const sampleDataAnalystRequirements: AgentRequirements = {
  name: 'Sales Data Analyzer',
  description: 'Analyzes sales data and generates insights with statistical analysis',
  primaryOutcome: 'Generate weekly sales reports with statistical analysis and visualizations',
  targetAudience: ['Sales managers', 'Marketing analysts'],
  interactionStyle: 'task-focused',
  deliveryChannels: ['CLI', 'API'],
  successMetrics: ['Report accuracy', 'Processing speed'],
  capabilities: {
    memory: 'short-term',
    fileAccess: true,
    webAccess: false,
    codeExecution: false,
    dataAnalysis: true,
    toolIntegrations: []
  },
  environment: {
    runtime: 'local'
  }
};

/**
 * Sample requirements designed to match the Content Creator template.
 * Tests content generation, SEO optimization, and multi-format publishing.
 */
export const sampleContentCreatorRequirements: AgentRequirements = {
  name: 'Blog Post Writer',
  description: 'Creates marketing content with SEO optimization',
  primaryOutcome: 'Write engaging blog posts and articles with SEO optimization for marketing',
  targetAudience: ['Content marketers', 'Bloggers'],
  interactionStyle: 'conversational',
  deliveryChannels: ['Web Application'],
  successMetrics: ['Content quality', 'SEO score'],
  capabilities: {
    memory: 'none',
    fileAccess: false,
    webAccess: true,
    codeExecution: false,
    dataAnalysis: false,
    toolIntegrations: []
  },
  environment: {
    runtime: 'cloud'
  }
};

/**
 * Sample requirements designed to match the Code Assistant template.
 * Tests code review, refactoring, and test generation capabilities.
 */
export const sampleCodeAssistantRequirements: AgentRequirements = {
  name: 'Code Reviewer',
  description: 'Reviews code for quality with testing and refactoring recommendations',
  primaryOutcome: 'Provide comprehensive code reviews with refactoring suggestions and testing guidance',
  targetAudience: ['Developers', 'Engineering teams'],
  interactionStyle: 'collaborative',
  deliveryChannels: ['IDE Extension', 'CLI'],
  successMetrics: ['Issue detection rate', 'False positive rate'],
  capabilities: {
    memory: 'short-term',
    fileAccess: true,
    webAccess: false,
    codeExecution: true,
    dataAnalysis: false,
    toolIntegrations: ['GitHub']
  },
  environment: {
    runtime: 'local'
  }
};

/**
 * Sample requirements designed to match the Research Agent template.
 * Tests web search, content extraction, and fact-checking capabilities.
 */
export const sampleResearchAgentRequirements: AgentRequirements = {
  name: 'Research Assistant',
  description: 'Conducts web research with content extraction and fact verification',
  primaryOutcome: 'Extract and verify information from web sources with fact-checking',
  targetAudience: ['Researchers', 'Journalists'],
  interactionStyle: 'task-focused',
  deliveryChannels: ['CLI', 'Web Application'],
  successMetrics: ['Source credibility', 'Information accuracy'],
  capabilities: {
    memory: 'long-term',
    fileAccess: false,
    webAccess: true,
    codeExecution: false,
    dataAnalysis: false,
    toolIntegrations: []
  },
  environment: {
    runtime: 'cloud'
  }
};

/**
 * Sample requirements designed to match the Automation Agent template.
 * Tests workflow orchestration, scheduling, and task automation.
 */
export const sampleAutomationAgentRequirements: AgentRequirements = {
  name: 'Workflow Automator',
  description: 'Automates repetitive tasks with workflow orchestration and job scheduling',
  primaryOutcome: 'Schedule and orchestrate automated task workflows with queue management',
  targetAudience: ['Operations teams', 'DevOps engineers'],
  interactionStyle: 'task-focused',
  deliveryChannels: ['API', 'CLI'],
  successMetrics: ['Task completion rate', 'Error rate'],
  capabilities: {
    memory: 'short-term',
    fileAccess: true,
    webAccess: false,
    codeExecution: true,
    dataAnalysis: false,
    toolIntegrations: ['Redis']
  },
  environment: {
    runtime: 'local'
  }
};

/**
 * Array containing all 5 sample requirements for iteration in tests.
 * Order matches the template declaration order in src/templates/index.ts.
 */
export const allSampleRequirements: AgentRequirements[] = [
  sampleDataAnalystRequirements,
  sampleContentCreatorRequirements,
  sampleCodeAssistantRequirements,
  sampleResearchAgentRequirements,
  sampleAutomationAgentRequirements
];

/**
 * Expected template IDs for each sample requirement (for validation).
 */
export const expectedTemplateIds = [
  'data-analyst',
  'content-creator',
  'code-assistant',
  'research-agent',
  'automation-agent'
];
