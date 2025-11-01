import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { AgentRequirements, AgentRecommendations } from '../../types/agent.js';
import { ConfigGenerator } from '../generation/config-generator.js';

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
      const {
        templateId,
        agentName,
        requirements,
        recommendations,
        includeReadme,
        includeExamples,
      } = input;
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

      const result = {
        success: true,
        implementationGuide,
        readme,
        files: [
          {
            name: 'IMPLEMENTATION.md',
            content: implementationGuide,
            description: 'Detailed implementation guide with step-by-step instructions',
          },
          ...(readme
            ? [
                {
                  name: 'README.md',
                  content: readme,
                  description: 'Project README with overview and quick start',
                },
              ]
            : []),
        ],
        metadata: {
          templateId,
          agentName,
          generatedAt: new Date().toISOString(),
          fileCount: readme ? 2 : 1,
        },
        nextSteps: [
          'Review the IMPLEMENTATION.md for detailed setup instructions',
          'Follow the step-by-step checklist to implement your agent',
          'Refer to the troubleshooting section if you encounter issues',
          'Customize the agent based on your specific requirements',
        ],
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
