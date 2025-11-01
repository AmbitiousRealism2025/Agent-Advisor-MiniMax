import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentClassifier } from './classifier.js';
import { agentRequirementsSchema } from '../../utils/validation.js';
import type { AgentRequirements } from '../../types/agent.js';

/**
 * Input schema for classify_agent_type tool
 * Accepts full agent requirements from completed interview
 */
const classifyAgentTypeSchemaShape = {
  requirements: z.object({
    name: z.string().describe('Agent name'),
    description: z.string().describe('Agent description'),
    primaryOutcome: z.string().describe('Primary outcome or goal'),
    targetAudience: z.array(z.string()).describe('Target audience segments'),
    interactionStyle: z.enum(['conversational', 'task-focused', 'collaborative']).describe('Preferred interaction style'),
    deliveryChannels: z.array(z.string()).describe('Delivery channels (CLI, web, IDE, etc.)'),
    successMetrics: z.array(z.string()).describe('Success measurement criteria'),
    constraints: z.array(z.string()).optional().describe('Constraints or limitations'),
    preferredTechnologies: z.array(z.string()).optional().describe('Preferred technologies'),
    capabilities: z.object({
      memory: z.enum(['none', 'short-term', 'long-term']).describe('Memory requirements'),
      fileAccess: z.boolean().describe('Requires file system access'),
      webAccess: z.boolean().describe('Requires web access'),
      codeExecution: z.boolean().describe('Requires code execution'),
      dataAnalysis: z.boolean().describe('Requires data analysis'),
      toolIntegrations: z.array(z.string()).describe('Required tool integrations'),
      notes: z.string().optional().describe('Additional capability notes')
    }).describe('Agent capabilities'),
    environment: z.object({
      runtime: z.enum(['cloud', 'local', 'hybrid']).describe('Runtime environment'),
      deploymentTargets: z.array(z.string()).optional().describe('Deployment targets'),
      complianceRequirements: z.array(z.string()).optional().describe('Compliance requirements')
    }).optional().describe('Environment preferences'),
    additionalNotes: z.string().optional().describe('Additional notes or context')
  }).describe('Complete agent requirements from interview'),
  includeAlternatives: z.boolean().optional().default(true).describe('Include alternative template recommendations')
};

const classifyAgentTypeSchema = z.object(classifyAgentTypeSchemaShape);

type ClassifyAgentTypeInput = z.infer<typeof classifyAgentTypeSchema>;

/**
 * Tool handler for agent type classification
 */
class ClassifyAgentTypeHandler {
  private classifier: AgentClassifier;

  constructor() {
    this.classifier = new AgentClassifier();
  }

  async handle(input: ClassifyAgentTypeInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    try {
      // Validate requirements using the standard schema
      const validationResult = agentRequirementsSchema.safeParse(input.requirements);

      if (!validationResult.success) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: 'Invalid agent requirements',
              details: validationResult.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
              }))
            }, null, 2)
          }]
        };
      }

      const requirements = validationResult.data as AgentRequirements;

      // Perform classification
      const recommendations = this.classifier.classify(requirements);

      // Get template scores for alternatives
      const scores = this.classifier.scoreAllTemplates(requirements);
      const primaryScore = scores[0];
      const alternatives = input.includeAlternatives ? scores.slice(1, 4) : [];

      // Build response
      const result = {
        status: 'success',
        classification: {
          selectedTemplate: recommendations.agentType,
          confidence: primaryScore.score,
          reasoning: primaryScore.reasoning
        },
        recommendations: {
          agentType: recommendations.agentType,
          systemPrompt: recommendations.systemPrompt,
          tools: recommendations.toolConfigurations.map(t => ({
            name: t.name,
            description: t.description,
            permissions: t.requiredPermissions
          })),
          dependencies: recommendations.requiredDependencies,
          mcpServers: recommendations.mcpServers,
          complexity: recommendations.estimatedComplexity,
          implementationSteps: recommendations.implementationSteps
        },
        alternatives: alternatives.map(alt => ({
          templateId: alt.templateId,
          confidence: alt.score,
          matchedCapabilities: alt.matchedCapabilities,
          reasoning: alt.reasoning
        })),
        nextSteps: [
          'Review the recommended template and tools',
          'Use generate_agent_code tool to create starter code',
          'Use generate_system_prompt tool to customize the system prompt',
          'Use generate_config_files tool to create project configuration'
        ],
        notes: recommendations.notes
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            error: 'Classification failed',
            details: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }
}

const handler = new ClassifyAgentTypeHandler();

/**
 * Create the classify_agent_type tool
 * Analyzes agent requirements and recommends the best template
 */
export const createClassifyAgentTypeTool = () => {
  return tool(
    'classify_agent_type',
    'Analyzes agent requirements from the interview and recommends the best template with tools, dependencies, and implementation plan. Returns primary recommendation with confidence score and optional alternative templates.',
    classifyAgentTypeSchemaShape,
    async (input: ClassifyAgentTypeInput) => handler.handle(input)
  );
};

export { ClassifyAgentTypeHandler, classifyAgentTypeSchema, classifyAgentTypeSchemaShape };
