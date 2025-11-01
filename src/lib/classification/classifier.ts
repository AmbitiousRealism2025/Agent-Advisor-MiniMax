import type { AgentRequirements, AgentRecommendations, AgentTemplate, MCPServerConfiguration } from '../../types/agent.js';
import { ALL_TEMPLATES, getTemplateById } from '../../templates/index.js';

export interface TemplateScore {
  templateId: string;
  score: number;
  matchedCapabilities: string[];
  missingCapabilities: string[];
  reasoning: string;
}

export class AgentClassifier {
  private templates: readonly AgentTemplate[];

  constructor() {
    this.templates = ALL_TEMPLATES;
  }

  /**
   * Classify agent requirements and generate recommendations
   * @param requirements - Agent requirements from interview
   * @returns Full agent recommendations with template, tools, and implementation plan
   */
  classify(requirements: AgentRequirements): AgentRecommendations {
    const scores = this.scoreAllTemplates(requirements);

    // Get best match
    const bestMatch = scores[0];
    const template = getTemplateById(bestMatch.templateId);

    if (!template) {
      throw new Error(`Template ${bestMatch.templateId} not found`);
    }

    // Generate MCP server recommendations
    const mcpServers = this.generateMCPServers(requirements, template);

    // Customize system prompt based on requirements
    const systemPrompt = this.customizeSystemPrompt(template, requirements);

    // Assess implementation complexity
    const complexity = this.assessComplexity(requirements, template);

    // Generate implementation steps
    const implementationSteps = this.generateImplementationSteps(requirements, template, complexity);

    return {
      agentType: template.id,
      requiredDependencies: template.requiredDependencies,
      mcpServers,
      systemPrompt,
      starterCode: this.generateStarterCode(template, requirements),
      toolConfigurations: template.defaultTools,
      estimatedComplexity: complexity,
      implementationSteps,
      notes: this.generateNotes(bestMatch, scores.slice(1, 3), requirements)
    };
  }

  /**
   * Score all templates against requirements
   * @param requirements - Agent requirements to match
   * @returns Sorted array of template scores (best match first)
   */
  scoreAllTemplates(requirements: AgentRequirements): TemplateScore[] {
    const scores = this.templates.map(template => this.scoreTemplate(template, requirements));
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Score a single template against requirements
   * @param template - Template to score
   * @param requirements - Requirements to match against
   * @returns Template score with reasoning
   */
  scoreTemplate(template: AgentTemplate, requirements: AgentRequirements): TemplateScore {
    let score = 0;
    const matchedCapabilities: string[] = [];
    const missingCapabilities: string[] = [];
    const reasons: string[] = [];

    // Score capability matches (40 points max)
    const requiredCapabilities = this.extractRequiredCapabilities(requirements);
    requiredCapabilities.forEach(cap => {
      if (template.capabilityTags.includes(cap)) {
        matchedCapabilities.push(cap);
        score += 8;
      } else {
        missingCapabilities.push(cap);
      }
    });

    // Score use case alignment (30 points max)
    const primaryOutcomeLower = requirements.primaryOutcome.toLowerCase();
    const matchingUseCases = template.idealFor.filter(useCase =>
      primaryOutcomeLower.includes(useCase.toLowerCase()) ||
      useCase.toLowerCase().includes(primaryOutcomeLower)
    );
    if (matchingUseCases.length > 0) {
      score += 15 * Math.min(matchingUseCases.length, 2);
      reasons.push(`Matches use cases: ${matchingUseCases.join(', ')}`);
    }

    // Score interaction style alignment (15 points max)
    if (this.matchesInteractionStyle(template, requirements.interactionStyle)) {
      score += 15;
      reasons.push(`Compatible with ${requirements.interactionStyle} interaction style`);
    }

    // Score capability requirements (15 points max)
    const capabilityScore = this.scoreCapabilityRequirements(template, requirements.capabilities);
    score += capabilityScore.score;
    if (capabilityScore.reasons.length > 0) {
      reasons.push(...capabilityScore.reasons);
    }

    // Generate reasoning summary
    const reasoning = this.buildReasoningSummary(template, matchedCapabilities, missingCapabilities, reasons);

    return {
      templateId: template.id,
      score,
      matchedCapabilities,
      missingCapabilities,
      reasoning
    };
  }

  /**
   * Generate MCP server recommendations based on requirements
   */
  generateMCPServers(requirements: AgentRequirements, template: AgentTemplate): MCPServerConfiguration[] {
    const servers: MCPServerConfiguration[] = [];

    // Web access requirement
    if (requirements.capabilities.webAccess) {
      servers.push({
        name: 'web-fetch',
        description: 'Web content fetching and scraping capabilities',
        url: 'https://github.com/anthropics/mcp-server-fetch',
        authentication: 'none'
      });
    }

    // File access requirement
    if (requirements.capabilities.fileAccess) {
      servers.push({
        name: 'filesystem',
        description: 'Local filesystem read/write operations',
        url: 'https://github.com/anthropics/mcp-server-filesystem',
        authentication: 'none'
      });
    }

    // Data analysis specific
    if (template.id === 'data-analyst' || requirements.capabilities.dataAnalysis) {
      servers.push({
        name: 'data-tools',
        description: 'Statistical analysis and data processing utilities',
        url: 'https://github.com/anthropics/mcp-server-everything',
        authentication: 'none'
      });
    }

    // Memory requirements
    if (requirements.capabilities.memory === 'long-term') {
      servers.push({
        name: 'memory',
        description: 'Persistent memory and context management',
        url: 'https://github.com/anthropics/mcp-server-memory',
        authentication: 'none'
      });
    }

    return servers;
  }

  /**
   * Customize system prompt based on specific requirements
   */
  customizeSystemPrompt(template: AgentTemplate, requirements: AgentRequirements): string {
    let prompt = template.systemPrompt;

    // Add agent name and description
    prompt = `# ${requirements.name}\n\n${requirements.description}\n\n${prompt}`;

    // Add target audience context
    if (requirements.targetAudience.length > 0) {
      prompt += `\n\n## Target Audience\nYou are designed to serve: ${requirements.targetAudience.join(', ')}`;
    }

    // Add primary outcome focus
    prompt += `\n\n## Primary Objective\n${requirements.primaryOutcome}`;

    // Add success metrics
    if (requirements.successMetrics.length > 0) {
      prompt += `\n\n## Success Metrics\nMeasure success by:\n${requirements.successMetrics.map(m => `- ${m}`).join('\n')}`;
    }

    // Add constraints
    if (requirements.constraints && requirements.constraints.length > 0) {
      prompt += `\n\n## Constraints\n${requirements.constraints.map(c => `- ${c}`).join('\n')}`;
    }

    // Add interaction style guidance
    prompt += `\n\n## Interaction Style\nMaintain a ${requirements.interactionStyle} approach in all interactions.`;

    return prompt;
  }

  /**
   * Assess implementation complexity
   */
  assessComplexity(requirements: AgentRequirements, template: AgentTemplate): 'low' | 'medium' | 'high' {
    let complexityScore = 0;

    // Tool count
    if (template.defaultTools.length > 6) complexityScore += 2;
    else if (template.defaultTools.length > 3) complexityScore += 1;

    // Capability requirements
    const capabilities = requirements.capabilities;
    if (capabilities.webAccess) complexityScore += 1;
    if (capabilities.fileAccess) complexityScore += 1;
    if (capabilities.codeExecution) complexityScore += 2;
    if (capabilities.dataAnalysis) complexityScore += 1;
    if (capabilities.memory === 'long-term') complexityScore += 2;
    if (capabilities.memory === 'short-term') complexityScore += 1;

    // Integration count
    if (capabilities.toolIntegrations.length > 3) complexityScore += 2;
    else if (capabilities.toolIntegrations.length > 0) complexityScore += 1;

    // Delivery channels
    if (requirements.deliveryChannels.length > 2) complexityScore += 1;

    // Environment complexity
    if (requirements.environment?.runtime === 'hybrid') complexityScore += 2;
    if (requirements.environment?.complianceRequirements && requirements.environment.complianceRequirements.length > 0) {
      complexityScore += 2;
    }

    // Classify based on score
    if (complexityScore <= 3) return 'low';
    if (complexityScore <= 7) return 'medium';
    return 'high';
  }

  /**
   * Generate implementation steps
   */
  generateImplementationSteps(
    requirements: AgentRequirements,
    template: AgentTemplate,
    complexity: 'low' | 'medium' | 'high'
  ): string[] {
    const steps: string[] = [
      'Initialize project structure with TypeScript and dependencies',
      `Configure ${template.name} template with ${template.defaultTools.length} core tools`,
      'Set up MiniMax API integration with Claude Agent SDK'
    ];

    // Add tool-specific steps
    if (template.defaultTools.length > 0) {
      steps.push(`Implement ${template.defaultTools.length} tool handlers: ${template.defaultTools.map(t => t.name).slice(0, 3).join(', ')}${template.defaultTools.length > 3 ? ', ...' : ''}`);
    }

    // Add capability implementation steps
    const caps = requirements.capabilities;
    if (caps.fileAccess) {
      steps.push('Configure filesystem access and file operation handlers');
    }
    if (caps.webAccess) {
      steps.push('Set up web fetching and content extraction capabilities');
    }
    if (caps.dataAnalysis) {
      steps.push('Implement data processing and analysis utilities');
    }
    if (caps.memory !== 'none') {
      steps.push(`Configure ${caps.memory} memory management system`);
    }

    // Add integration steps
    if (caps.toolIntegrations.length > 0) {
      steps.push(`Integrate with external services: ${caps.toolIntegrations.slice(0, 3).join(', ')}${caps.toolIntegrations.length > 3 ? ', ...' : ''}`);
    }

    // Add testing and validation
    steps.push('Create test suite for tool validation and error handling');
    steps.push('Configure environment variables and deployment settings');

    // Add complexity-specific steps
    if (complexity === 'high') {
      steps.push('Implement comprehensive error recovery and fallback strategies');
      steps.push('Set up monitoring and performance optimization');
    }

    steps.push('Document API usage and deployment instructions');

    return steps;
  }

  /**
   * Generate starter code reference
   */
  private generateStarterCode(template: AgentTemplate, requirements: AgentRequirements): string {
    return `// ${requirements.name} - Generated from ${template.name} template
// See full implementation in generated project files

import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { getMinimaxConfig } from './config.js';
${template.defaultTools.length > 0 ? `import { ${template.defaultTools.map(t => `${t.name}Tool`).join(', ')} } from './tools.js';\n` : ''}
const config = getMinimaxConfig();

const agent = new Agent({
  model: config.model,
  apiKey: config.apiKey,
  baseUrl: config.baseUrl,
  systemPrompt: \`${template.systemPrompt.substring(0, 200)}...\`,
  tools: [${template.defaultTools.map(t => `${t.name}Tool`).join(', ')}]
});

// Start agent and handle interactions
await agent.run();`;
  }

  /**
   * Generate notes about classification results
   */
  private generateNotes(bestMatch: TemplateScore, alternatives: TemplateScore[], requirements: AgentRequirements): string {
    const notes: string[] = [];

    notes.push(`Selected ${bestMatch.templateId} template with ${bestMatch.score.toFixed(0)}% confidence.`);

    if (bestMatch.missingCapabilities.length > 0) {
      notes.push(`Note: Template does not natively support: ${bestMatch.missingCapabilities.join(', ')}. These may require custom implementation.`);
    }

    if (alternatives.length > 0 && alternatives[0].score > 50) {
      notes.push(`Alternative options: ${alternatives.map(a => `${a.templateId} (${a.score.toFixed(0)}%)`).join(', ')}`);
    }

    if (requirements.additionalNotes) {
      notes.push(`Additional context: ${requirements.additionalNotes}`);
    }

    return notes.join('\n');
  }

  /**
   * Extract required capabilities from requirements
   */
  private extractRequiredCapabilities(requirements: AgentRequirements): string[] {
    const capabilities: string[] = [];

    // Map capabilities to template tags
    if (requirements.capabilities.fileAccess) capabilities.push('file-access');
    if (requirements.capabilities.webAccess) capabilities.push('web-access');
    if (requirements.capabilities.dataAnalysis) capabilities.push('data-processing', 'statistics');
    if (requirements.capabilities.codeExecution) capabilities.push('code-review', 'testing');

    // Extract from primary outcome
    const outcome = requirements.primaryOutcome.toLowerCase();
    if (outcome.includes('data') || outcome.includes('analys')) capabilities.push('data-processing');
    if (outcome.includes('content') || outcome.includes('writ')) capabilities.push('content-creation');
    if (outcome.includes('code') || outcome.includes('develop')) capabilities.push('code-review');
    if (outcome.includes('research') || outcome.includes('search')) capabilities.push('research', 'web-search');
    if (outcome.includes('automat') || outcome.includes('workflow')) capabilities.push('automation');

    return [...new Set(capabilities)]; // Remove duplicates
  }

  /**
   * Check if template matches interaction style
   */
  private matchesInteractionStyle(template: AgentTemplate, style: string): boolean {
    // All templates are flexible, but some are better suited
    const styleMap: Record<string, string[]> = {
      'conversational': ['content-creator', 'research-agent'],
      'task-focused': ['data-analyst', 'code-assistant', 'automation-agent'],
      'collaborative': ['code-assistant', 'content-creator']
    };

    return styleMap[style]?.includes(template.id) ?? true;
  }

  /**
   * Score capability requirements alignment
   */
  private scoreCapabilityRequirements(template: AgentTemplate, capabilities: AgentRequirements['capabilities']): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Check if template supports required capabilities
    const supportsFileAccess = template.capabilityTags.includes('file-access');
    const supportsWebAccess = template.capabilityTags.includes('web-access');
    const supportsDataAnalysis = template.capabilityTags.includes('data-processing');

    if (capabilities.fileAccess && supportsFileAccess) {
      score += 5;
      reasons.push('Supports file access');
    }
    if (capabilities.webAccess && supportsWebAccess) {
      score += 5;
      reasons.push('Supports web access');
    }
    if (capabilities.dataAnalysis && supportsDataAnalysis) {
      score += 5;
      reasons.push('Supports data analysis');
    }

    return { score, reasons };
  }

  /**
   * Build reasoning summary
   */
  private buildReasoningSummary(
    template: AgentTemplate,
    matched: string[],
    missing: string[],
    reasons: string[]
  ): string {
    const parts: string[] = [];

    if (matched.length > 0) {
      parts.push(`Matched capabilities: ${matched.join(', ')}`);
    }
    if (missing.length > 0) {
      parts.push(`Missing capabilities: ${missing.join(', ')}`);
    }
    if (reasons.length > 0) {
      parts.push(...reasons);
    }

    return parts.join('. ') || 'Basic template match';
  }
}
