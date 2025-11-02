import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { AgentRequirements, AgentRecommendations } from '../../types/agent.js';
import { ConfigGenerator } from '../generation/config-generator.js';
import { ErrorCodes, createToolError, formatToolErrorAsMarkdown } from '../../types/errors.js';
import { ALL_TEMPLATES } from '../../templates/index.js';

/**
 * Schema shape for generate_implementation_guide tool
 */
const generateImplementationGuideSchemaShape = {
  templateId: z
    .string()
    .describe('Template identifier (e.g., data-analyst, content-creator)'),
  agentName: z.string().describe('Name of the agent being generated'),
  requirements: z.object({
    name: z.string(),
    description: z.string(),
    primaryOutcome: z.string(),
    targetAudience: z.array(z.string()),
    interactionStyle: z.enum(['conversational', 'task-focused', 'collaborative']),
    deliveryChannels: z.array(z.string()),
    successMetrics: z.array(z.string()),
    constraints: z.array(z.string()).optional(),
    preferredTechnologies: z.array(z.string()).optional(),
    capabilities: z.object({
      memory: z.enum(['none', 'short-term', 'long-term']),
      fileAccess: z.boolean(),
      webAccess: z.boolean(),
      codeExecution: z.boolean(),
      dataAnalysis: z.boolean(),
      toolIntegrations: z.array(z.string()),
      notes: z.string().optional()
    }),
    environment: z.object({
      runtime: z.enum(['cloud', 'local', 'hybrid']),
      deploymentTargets: z.array(z.string()).optional(),
      complianceRequirements: z.array(z.string()).optional()
    }).optional(),
    additionalNotes: z.string().optional()
  }).describe('Full requirements from the interview phase'),
  recommendations: z.object({
    agentType: z.string(),
    requiredDependencies: z.array(z.string()),
    mcpServers: z.array(z.object({
      name: z.string(),
      description: z.string(),
      url: z.string(),
      authentication: z.enum(['apiKey', 'oauth', 'none']).optional()
    })),
    systemPrompt: z.string(),
    starterCode: z.string(),
    toolConfigurations: z.array(z.unknown()),
    estimatedComplexity: z.enum(['low', 'medium', 'high']),
    implementationSteps: z.array(z.string()),
    notes: z.string().optional()
  }).describe('Classification recommendations from the classifier'),
  includeReadme: z
    .boolean()
    .default(true)
    .describe('Whether to include a README.md file'),
  includeExamples: z
    .boolean()
    .default(true)
    .describe('Whether to include usage examples'),
};

type GenerateImplementationGuideInput = {
  templateId: string;
  agentName: string;
  requirements: AgentRequirements;
  recommendations: {
    agentType: string;
    requiredDependencies: string[];
    mcpServers: Array<{
      name: string;
      description: string;
      url: string;
      authentication?: 'apiKey' | 'oauth' | 'none';
    }>;
    systemPrompt: string;
    starterCode: string;
    toolConfigurations: unknown[];
    estimatedComplexity: 'low' | 'medium' | 'high';
    implementationSteps: string[];
    notes?: string;
  };
  includeReadme: boolean;
  includeExamples: boolean;
};

/**
 * Tool for generating implementation guides
 */
export function createGenerateImplementationGuideTool() {
  return tool(
    'generate_implementation_guide',
    'Generates comprehensive implementation guide and README for the agent project. Includes step-by-step instructions, troubleshooting tips, and usage examples.',
    generateImplementationGuideSchemaShape,
    async (input: GenerateImplementationGuideInput) => {
      try {
        const {
          templateId,
          agentName,
          requirements,
          recommendations,
          includeReadme,
          includeExamples,
        } = input;

        // Validate template ID
        const validTemplates = ALL_TEMPLATES.map(t => t.id);
        if (!validTemplates.includes(templateId)) {
          const error = createToolError(
            ErrorCodes.INVALID_TEMPLATE,
            `Invalid template ID: ${templateId}`,
            {
              field: 'templateId',
              validValues: validTemplates,
              context: { provided: templateId }
            }
          );
          return {
            content: [{
              type: 'text' as const,
              text: formatToolErrorAsMarkdown(error)
            }]
          };
        }

        // Validate agent name (basic non-empty check)
        const trimmedName = agentName.trim();
        if (!trimmedName || trimmedName.length === 0) {
          const error = createToolError(
            ErrorCodes.INVALID_AGENT_NAME,
            'Agent name cannot be empty',
            {
              field: 'agentName',
              context: {
                provided: agentName,
                requirement: 'Must be a non-empty string'
              }
            }
          );
          return {
            content: [{
              type: 'text' as const,
              text: formatToolErrorAsMarkdown(error)
            }]
          };
        }

        const configGen = new ConfigGenerator();

        // Generate implementation guide
        const implementationGuide = configGen.generateImplementationGuide({
          templateId,
          agentName,
          requirements,
          recommendations: recommendations as AgentRecommendations,
        });

        // Generate README if requested
        let readme: string | undefined;
        if (includeReadme) {
          readme = configGen.generateREADME({
            templateId,
            agentName,
            requirements,
            recommendations: recommendations as AgentRecommendations,
          });
        }

        // Build comprehensive Markdown document
        let markdown = `## Implementation Guide\n\n`;

        // Add implementation guide
        markdown += `### File: \`IMPLEMENTATION.md\`\n\n`;
        markdown += `\`\`\`markdown\n${implementationGuide}\n\`\`\`\n\n`;
        markdown += `**To use**: Copy the above content to \`IMPLEMENTATION.md\` in your project root.\n\n`;

        // Add README if requested
        if (readme) {
          markdown += `### File: \`README.md\`\n\n`;
          markdown += `\`\`\`markdown\n${readme}\n\`\`\`\n\n`;
          markdown += `**To use**: Copy the above content to \`README.md\` in your project root.\n\n`;
        }

        // Add files generated summary
        markdown += `## Files Generated\n\n`;
        markdown += `1. \`IMPLEMENTATION.md\` - Detailed implementation guide with step-by-step instructions\n`;
        if (readme) {
          markdown += `2. \`README.md\` - Project README with overview and quick start\n`;
        }

        // Add metadata
        markdown += `\n## Generation Metadata\n\n`;
        markdown += `- **Template**: ${templateId}\n`;
        markdown += `- **Agent Name**: ${agentName}\n`;
        markdown += `- **Generated At**: ${new Date().toISOString()}\n`;
        markdown += `- **Files Created**: ${readme ? 2 : 1}\n`;

        // Add next steps
        markdown += `\n## Next Steps\n\n`;
        markdown += `1. Review the IMPLEMENTATION.md for detailed setup instructions\n`;
        markdown += `2. Follow the step-by-step checklist to implement your agent\n`;
        markdown += `3. Refer to the troubleshooting section if you encounter issues\n`;
        markdown += `4. Customize the agent based on your specific requirements\n`;
        markdown += `5. Test the agent thoroughly before deploying\n`;

        return {
          content: [{ type: 'text' as const, text: markdown }],
        };
      } catch (error) {
        const toolError = createToolError(
          ErrorCodes.GENERATION_FAILED,
          'Implementation guide generation failed',
          {
            context: {
              templateId: input.templateId,
              agentName: input.agentName,
              errorMessage: error instanceof Error ? error.message : String(error)
            }
          }
        );

        return {
          content: [{
            type: 'text' as const,
            text: formatToolErrorAsMarkdown(toolError)
          }]
        };
      }
    }
  );
}
