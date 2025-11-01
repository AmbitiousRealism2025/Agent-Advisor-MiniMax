import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { CodeGenerator } from './code-generator.js';
import { PromptGenerator } from './prompt-generator.js';
import { ConfigGenerator } from './config-generator.js';
import { agentRequirementsSchema } from '../../utils/validation.js';
import type { AgentRequirements, AgentRecommendations } from '../../types/agent.js';

/**
 * Schema for generate_agent_code tool
 */
const generateAgentCodeSchemaShape = {
  templateId: z.string().describe('Template ID to use for code generation'),
  agentName: z.string().describe('Name of the agent'),
  includeComments: z.boolean().optional().default(true).describe('Include explanatory comments in code'),
  includeErrorHandling: z.boolean().optional().default(true).describe('Include error handling blocks'),
  includeSampleUsage: z.boolean().optional().default(true).describe('Include sample usage documentation')
};

const generateAgentCodeSchema = z.object(generateAgentCodeSchemaShape);
type GenerateAgentCodeInput = z.infer<typeof generateAgentCodeSchema>;

/**
 * Schema for generate_system_prompt tool
 */
const generateSystemPromptSchemaShape = {
  templateId: z.string().describe('Template ID to use for prompt generation'),
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
  }).describe('Agent requirements from interview'),
  includeExamples: z.boolean().optional().default(true).describe('Include example interactions'),
  includeConstraints: z.boolean().optional().default(true).describe('Include constraints section'),
  verbosityLevel: z.enum(['concise', 'standard', 'detailed']).optional().default('standard').describe('Level of detail in prompt')
};

const generateSystemPromptSchema = z.object(generateSystemPromptSchemaShape);
type GenerateSystemPromptInput = z.infer<typeof generateSystemPromptSchema>;

/**
 * Schema for generate_config_files tool
 */
const generateConfigFilesSchemaShape = {
  templateId: z.string().describe('Template ID to use for configuration'),
  agentName: z.string().describe('Name of the agent'),
  projectName: z.string().optional().describe('Project name (defaults to kebab-case agent name)'),
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
  }).describe('Agent requirements'),
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
  }).optional().describe('Agent recommendations from classification'),
  files: z.array(z.enum(['agent-config', 'env', 'package', 'tsconfig', 'readme', 'implementation-guide']))
    .optional()
    .default(['agent-config', 'env', 'package', 'tsconfig', 'readme'])
    .describe('Which configuration files to generate')
};

const generateConfigFilesSchema = z.object(generateConfigFilesSchemaShape);
type GenerateConfigFilesInput = z.infer<typeof generateConfigFilesSchema>;

/**
 * Tool handler for agent code generation
 */
class GenerateAgentCodeHandler {
  private generator: CodeGenerator;

  constructor() {
    this.generator = new CodeGenerator();
  }

  async handle(input: GenerateAgentCodeInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    try {
      const code = this.generator.generateFullCode({
        templateId: input.templateId,
        agentName: input.agentName,
        includeComments: input.includeComments,
        includeErrorHandling: input.includeErrorHandling,
        includeSampleUsage: input.includeSampleUsage
      });

      const result = {
        status: 'success',
        code,
        metadata: {
          templateId: input.templateId,
          agentName: input.agentName,
          linesOfCode: code.split('\n').length,
          features: {
            comments: input.includeComments,
            errorHandling: input.includeErrorHandling,
            sampleUsage: input.includeSampleUsage
          }
        },
        nextSteps: [
          'Save the code to src/index.ts in your project',
          'Review and customize tool implementations',
          'Update the system prompt as needed',
          'Run npm install to install dependencies',
          'Run npm run build to compile TypeScript'
        ]
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
            error: 'Code generation failed',
            details: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }
}

/**
 * Tool handler for system prompt generation
 */
class GenerateSystemPromptHandler {
  private generator: PromptGenerator;

  constructor() {
    this.generator = new PromptGenerator();
  }

  async handle(input: GenerateSystemPromptInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    try {
      // Validate requirements
      const validationResult = agentRequirementsSchema.safeParse(input.requirements);
      if (!validationResult.success) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: 'Invalid requirements',
              details: validationResult.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
              }))
            }, null, 2)
          }]
        };
      }

      const prompt = this.generator.generate({
        templateId: input.templateId,
        requirements: validationResult.data as AgentRequirements,
        includeExamples: input.includeExamples,
        includeConstraints: input.includeConstraints,
        verbosityLevel: input.verbosityLevel
      });

      const result = {
        status: 'success',
        prompt,
        metadata: {
          templateId: input.templateId,
          agentName: input.requirements.name,
          wordCount: prompt.split(/\s+/).length,
          sections: prompt.split('\n## ').length - 1,
          verbosity: input.verbosityLevel
        },
        nextSteps: [
          'Review the generated system prompt',
          'Customize specific sections as needed',
          'Test the prompt with sample interactions',
          'Update agent configuration with the prompt'
        ]
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
            error: 'Prompt generation failed',
            details: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }
}

/**
 * Tool handler for configuration file generation
 */
class GenerateConfigFilesHandler {
  private generator: ConfigGenerator;

  constructor() {
    this.generator = new ConfigGenerator();
  }

  async handle(input: GenerateConfigFilesInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    try {
      // Validate requirements
      const validationResult = agentRequirementsSchema.safeParse(input.requirements);
      if (!validationResult.success) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: 'Invalid requirements',
              details: validationResult.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
              }))
            }, null, 2)
          }]
        };
      }

      const options = {
        templateId: input.templateId,
        agentName: input.agentName,
        projectName: input.projectName,
        requirements: validationResult.data as AgentRequirements,
        recommendations: input.recommendations as AgentRecommendations | undefined
      };

      const files: Record<string, string> = {};

      input.files?.forEach(fileType => {
        switch (fileType) {
          case 'agent-config':
            files['agent.config.json'] = this.generator.generateAgentConfigJSON(options);
            break;
          case 'env':
            files['.env.example'] = this.generator.generateEnvFile(options);
            break;
          case 'package':
            files['package.json'] = this.generator.generatePackageJSON(options);
            break;
          case 'tsconfig':
            files['tsconfig.json'] = this.generator.generateTSConfig();
            break;
          case 'readme':
            files['README.md'] = this.generator.generateREADME(options);
            break;
          case 'implementation-guide':
            files['IMPLEMENTATION.md'] = this.generator.generateImplementationGuide(options);
            break;
        }
      });

      const result = {
        status: 'success',
        files,
        metadata: {
          templateId: input.templateId,
          agentName: input.agentName,
          fileCount: Object.keys(files).length,
          generatedFiles: Object.keys(files)
        },
        nextSteps: [
          'Create a new project directory',
          'Save each file to its appropriate location',
          'Run npm install to install dependencies',
          'Review and customize configurations as needed',
          'Begin implementing tool logic'
        ]
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
            error: 'Configuration generation failed',
            details: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }
}

// Create handler instances
const codeHandler = new GenerateAgentCodeHandler();
const promptHandler = new GenerateSystemPromptHandler();
const configHandler = new GenerateConfigFilesHandler();

/**
 * Create generate_agent_code tool
 */
export const createGenerateAgentCodeTool = () => {
  return tool(
    'generate_agent_code',
    'Generates complete TypeScript agent implementation code based on a template. Includes imports, utilities, tool implementations, agent initialization, and main execution function with optional comments, error handling, and usage examples.',
    generateAgentCodeSchemaShape,
    async (input: GenerateAgentCodeInput) => codeHandler.handle(input)
  );
};

/**
 * Create generate_system_prompt tool
 */
export const createGenerateSystemPromptTool = () => {
  return tool(
    'generate_system_prompt',
    'Generates a customized system prompt for the agent based on template and requirements. Includes role definition, capabilities, objectives, constraints, interaction guidelines, examples, and success metrics with configurable verbosity and sections.',
    generateSystemPromptSchemaShape,
    async (input: GenerateSystemPromptInput) => promptHandler.handle(input)
  );
};

/**
 * Create generate_config_files tool
 */
export const createGenerateConfigFilesTool = () => {
  return tool(
    'generate_config_files',
    'Generates project configuration files including agent config JSON, environment variables, package.json, TypeScript config, README, and implementation guide. Customize which files to generate based on project needs.',
    generateConfigFilesSchemaShape,
    async (input: GenerateConfigFilesInput) => configHandler.handle(input)
  );
};

export {
  GenerateAgentCodeHandler,
  GenerateSystemPromptHandler,
  GenerateConfigFilesHandler,
  generateAgentCodeSchema,
  generateSystemPromptSchema,
  generateConfigFilesSchema
};
