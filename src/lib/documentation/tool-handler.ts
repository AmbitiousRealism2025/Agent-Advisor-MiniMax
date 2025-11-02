import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { agentRequirementsSchema } from '../../utils/validation.js';
import type { AgentRecommendations, AgentRequirements } from '../../types/agent.js';
import { createToolError, ErrorCodes, formatToolErrorAsMarkdown, isToolError } from '../../types/errors.js';
import { PlanningDocumentGenerator } from './document-generator.js';
import { isValidDocumentTemplateId } from '../../templates/index.js';

const mcpServerSchema = z.object({
  name: z.string().describe('MCP server identifier'),
  description: z.string().describe('Purpose of the MCP server'),
  url: z.string().describe('Reference URL for setup guidance'),
  authentication: z.enum(['apiKey', 'oauth', 'none']).optional().describe('Authentication model')
});

const toolConfigurationSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()).default({}),
  requiredPermissions: z.array(z.string()).default([])
});

const recommendationsSchema = z.object({
  agentType: z.string(),
  requiredDependencies: z.array(z.string()),
  mcpServers: z.array(mcpServerSchema),
  systemPrompt: z.string(),
  toolConfigurations: z.array(toolConfigurationSchema),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
  implementationSteps: z.array(z.string()),
  notes: z.string().optional()
});

const generatePlanningDocumentSchema = z.object({
  templateId: z.string().min(1).describe('Template identifier (e.g., data-analyst)'),
  agentName: z.string().min(1).describe('Display name for the agent'),
  requirements: agentRequirementsSchema.describe('Validated requirements gathered during the interview phase'),
  recommendations: recommendationsSchema.describe('Detailed classification recommendations to inform planning')
});

type GeneratePlanningDocumentInput = z.infer<typeof generatePlanningDocumentSchema>;

class GeneratePlanningDocumentHandler {
  private generator: PlanningDocumentGenerator;

  constructor() {
    this.generator = new PlanningDocumentGenerator();
  }

  async handle(input: GeneratePlanningDocumentInput): Promise<string> {
    const document = this.generator.generate({
      templateId: input.templateId,
      agentName: input.agentName.trim(),
      requirements: input.requirements as AgentRequirements,
      recommendations: input.recommendations as AgentRecommendations
    });

    return [
      '## Planning Document',
      '',
      '### File: `docs/planning.md`',
      '```markdown',
      document,
      '```',
      '',
      '**To use**: Copy the above Markdown to `docs/planning.md` within your project workspace.',
      '',
      '## Next Steps',
      '1. Review the planning brief with stakeholders.',
      '2. Confirm owners and target timelines for each phase.',
      '3. Begin execution following the documented roadmap.'
    ].join('\n');
  }
}

const handler = new GeneratePlanningDocumentHandler();

export function createGeneratePlanningDocumentTool() {
  return tool(
    'generate_planning_document',
    'Produces a comprehensive Markdown planning document summarizing requirements, architecture, phased delivery, security, metrics, risks, and deployment considerations.',
    generatePlanningDocumentSchema.shape,
    async (input) => {
      const parsed = generatePlanningDocumentSchema.safeParse(input);

      if (!parsed.success) {
        const issues = parsed.error.issues.map(issue => ({
          path: issue.path.join('.') || 'root',
          message: issue.message
        }));

        const error = createToolError(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid generate_planning_document parameters',
          { validationErrors: issues }
        );

        return {
          content: [{
            type: 'text' as const,
            text: formatToolErrorAsMarkdown(error)
          }]
        };
      }

      // Validate templateId using document template validator
      if (!isValidDocumentTemplateId(parsed.data.templateId)) {
        const error = createToolError(
          ErrorCodes.TEMPLATE_NOT_FOUND,
          `Template "${parsed.data.templateId}" not found in document templates`,
          { context: { templateId: parsed.data.templateId } }
        );

        return {
          content: [{
            type: 'text' as const,
            text: formatToolErrorAsMarkdown(error)
          }]
        };
      }

      try {
        const markdown = await handler.handle(parsed.data);
        return {
          content: [{
            type: 'text' as const,
            text: markdown
          }]
        };
      } catch (error) {
        if (isToolError(error)) {
          return {
            content: [{
              type: 'text' as const,
              text: formatToolErrorAsMarkdown(error)
            }]
          };
        }

        const fallbackError = createToolError(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to generate planning document',
          {
            context: {
              message: error instanceof Error ? error.message : String(error)
            }
          }
        );

        return {
          content: [{
            type: 'text' as const,
            text: formatToolErrorAsMarkdown(fallbackError)
          }]
        };
      }
    }
  );
}
