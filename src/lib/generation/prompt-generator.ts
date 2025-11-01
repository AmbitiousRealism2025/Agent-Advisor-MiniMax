import { getTemplateById } from '../../templates/index.js';
import type { AgentRequirements } from '../../types/agent.js';

export interface PromptGenerationOptions {
  templateId: string;
  requirements: AgentRequirements;
  includeExamples?: boolean;
  includeConstraints?: boolean;
  verbosityLevel?: 'concise' | 'standard' | 'detailed';
}

export class PromptGenerator {
  /**
   * Generate customized system prompt
   */
  generate(options: PromptGenerationOptions): string {
    const template = getTemplateById(options.templateId);
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }

    const {
      requirements,
      includeExamples = true,
      includeConstraints = true,
      verbosityLevel = 'standard'
    } = options;

    const sections = [
      this.generateHeader(requirements),
      this.generateRoleDefinition(template, requirements, verbosityLevel),
      this.generateCapabilitiesSection(template, requirements),
      this.generateObjectivesSection(requirements),
      includeConstraints ? this.generateConstraintsSection(requirements) : '',
      this.generateInteractionGuidelines(requirements),
      includeExamples ? this.generateExamplesSection(template, verbosityLevel) : '',
      this.generateSuccessMetrics(requirements)
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Generate prompt header
   */
  private generateHeader(requirements: AgentRequirements): string {
    const lines: string[] = [];
    lines.push(`# ${requirements.name}`);
    lines.push('');
    lines.push(requirements.description);

    return lines.join('\n');
  }

  /**
   * Generate role definition section
   */
  private generateRoleDefinition(template: any, requirements: AgentRequirements, verbosity: string): string {
    const lines: string[] = [];
    lines.push('## Your Role');
    lines.push('');

    if (verbosity === 'detailed') {
      lines.push(`You are ${requirements.name}, ${template.description.toLowerCase()}`);
      lines.push('');
      lines.push('Your primary responsibilities include:');
      template.idealFor.forEach((use: string) => {
        lines.push(`- ${use}`);
      });
    } else {
      lines.push(template.systemPrompt.split('\n\n')[0]); // First paragraph of template prompt
    }

    return lines.join('\n');
  }

  /**
   * Generate capabilities section
   */
  private generateCapabilitiesSection(template: any, requirements: AgentRequirements): string {
    const lines: string[] = [];
    lines.push('## Capabilities');
    lines.push('');

    const caps = requirements.capabilities;

    lines.push('You have access to the following capabilities:');
    lines.push('');

    // Core template capabilities
    lines.push('### Core Tools');
    template.defaultTools.forEach((tool: any) => {
      lines.push(`- **${tool.name}**: ${tool.description}`);
    });

    lines.push('');
    lines.push('### System Capabilities');

    if (caps.fileAccess) {
      lines.push('- **File Access**: Read and write files to the local filesystem');
    }
    if (caps.webAccess) {
      lines.push('- **Web Access**: Fetch and process web content');
    }
    if (caps.codeExecution) {
      lines.push('- **Code Execution**: Execute code in a sandboxed environment');
    }
    if (caps.dataAnalysis) {
      lines.push('- **Data Analysis**: Process and analyze structured data');
    }
    if (caps.memory !== 'none') {
      lines.push(`- **Memory**: ${caps.memory === 'long-term' ? 'Persistent' : 'Session-based'} memory for context retention`);
    }

    if (caps.toolIntegrations.length > 0) {
      lines.push('');
      lines.push('### Integrated Tools');
      caps.toolIntegrations.forEach(integration => {
        lines.push(`- ${integration}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate objectives section
   */
  private generateObjectivesSection(requirements: AgentRequirements): string {
    const lines: string[] = [];
    lines.push('## Primary Objectives');
    lines.push('');
    lines.push(requirements.primaryOutcome);

    if (requirements.targetAudience.length > 0) {
      lines.push('');
      lines.push('### Target Audience');
      lines.push(`You are designed to serve: ${requirements.targetAudience.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate constraints section
   */
  private generateConstraintsSection(requirements: AgentRequirements): string {
    if (!requirements.constraints || requirements.constraints.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('## Constraints and Limitations');
    lines.push('');
    lines.push('You must operate within these constraints:');
    requirements.constraints.forEach(constraint => {
      lines.push(`- ${constraint}`);
    });

    if (requirements.environment?.complianceRequirements) {
      lines.push('');
      lines.push('### Compliance Requirements');
      requirements.environment.complianceRequirements.forEach(req => {
        lines.push(`- ${req}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate interaction guidelines
   */
  private generateInteractionGuidelines(requirements: AgentRequirements): string {
    const lines: string[] = [];
    lines.push('## Interaction Guidelines');
    lines.push('');

    const styleMap = {
      conversational: 'Engage in natural, friendly dialogue. Ask clarifying questions and provide explanations in an accessible way.',
      'task-focused': 'Be direct and efficient. Focus on completing tasks with minimal back-and-forth. Provide clear, actionable outputs.',
      collaborative: 'Work as a partner with the user. Offer suggestions, seek feedback, and iterate on solutions together.'
    };

    lines.push(styleMap[requirements.interactionStyle]);

    if (requirements.deliveryChannels.length > 0) {
      lines.push('');
      lines.push('### Delivery Channels');
      lines.push(`This agent is designed for: ${requirements.deliveryChannels.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate examples section
   */
  private generateExamplesSection(template: any, verbosity: string): string {
    if (verbosity === 'concise') {
      return '';
    }

    const lines: string[] = [];
    lines.push('## Example Interactions');
    lines.push('');

    // Generate template-specific examples
    const exampleMap: Record<string, string[]> = {
      'data-analyst': [
        '**User**: "Analyze sales_data.csv and show me the top performing products"',
        '**Agent**: Uses read_csv to load data, analyze_data for statistics, and generate_visualization for insights',
        '',
        '**User**: "Create a quarterly report in Markdown format"',
        '**Agent**: Uses analyze_data to compute metrics and export_report to generate formatted output'
      ],
      'content-creator': [
        '**User**: "Write a blog post about sustainable technology"',
        '**Agent**: Uses generate_outline to structure content, then write_section for each part',
        '',
        '**User**: "Optimize this article for SEO"',
        '**Agent**: Uses optimize_for_seo to analyze keywords and improve readability'
      ],
      'code-assistant': [
        '**User**: "Review this authentication module for security issues"',
        '**Agent**: Uses analyze_code to identify vulnerabilities and suggest_improvements for fixes',
        '',
        '**User**: "Generate tests for the user service"',
        '**Agent**: Uses generate_tests to create comprehensive unit and integration tests'
      ],
      'research-agent': [
        '**User**: "Find recent information about quantum computing breakthroughs"',
        '**Agent**: Uses web_search to find sources, scrape_content to extract information, and verify_sources for credibility',
        '',
        '**User**: "Fact-check these statistics about renewable energy"',
        '**Agent**: Uses extract_facts to identify claims and verify_sources to validate accuracy'
      ],
      'automation-agent': [
        '**User**: "Schedule a daily data backup at midnight"',
        '**Agent**: Uses schedule_task to set up recurring backup with notifications',
        '',
        '**User**: "Create a workflow to process incoming files"',
        '**Agent**: Uses execute_workflow to set up multi-step processing with error handling'
      ]
    };

    const examples = exampleMap[template.id] || [];
    if (examples.length > 0) {
      lines.push(...examples);
    }

    return lines.join('\n');
  }

  /**
   * Generate success metrics section
   */
  private generateSuccessMetrics(requirements: AgentRequirements): string {
    const lines: string[] = [];
    lines.push('## Success Metrics');
    lines.push('');
    lines.push('Your performance will be measured by:');
    requirements.successMetrics.forEach(metric => {
      lines.push(`- ${metric}`);
    });

    if (requirements.additionalNotes) {
      lines.push('');
      lines.push('## Additional Context');
      lines.push('');
      lines.push(requirements.additionalNotes);
    }

    return lines.join('\n');
  }

  /**
   * Generate a concise version of the prompt
   */
  generateConcise(options: PromptGenerationOptions): string {
    return this.generate({
      ...options,
      includeExamples: false,
      includeConstraints: true,
      verbosityLevel: 'concise'
    });
  }

  /**
   * Generate a detailed version of the prompt
   */
  generateDetailed(options: PromptGenerationOptions): string {
    return this.generate({
      ...options,
      includeExamples: true,
      includeConstraints: true,
      verbosityLevel: 'detailed'
    });
  }
}
