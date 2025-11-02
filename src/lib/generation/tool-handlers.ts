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

      const linesOfCode = code.split('\n').length;

      // Build Markdown document
      const markdown = `## Agent Code Generated

### File: \`src/index.ts\`

\`\`\`typescript
${code}
\`\`\`

**To use**: Copy the above code to \`src/index.ts\` in your project directory.

## Code Metadata

- **Template**: ${input.templateId}
- **Agent Name**: ${input.agentName}
- **Lines of Code**: ${linesOfCode}
- **Features Included**:
  - Comments: ${input.includeComments ? 'Yes' : 'No'}
  - Error Handling: ${input.includeErrorHandling ? 'Yes' : 'No'}
  - Sample Usage: ${input.includeSampleUsage ? 'Yes' : 'No'}

## Next Steps

1. Create your project directory
2. Copy the code above to \`src/index.ts\`
3. Review and customize tool implementations
4. Update the system prompt as needed
5. Run \`npm install\` to install dependencies
6. Run \`npm run build\` to compile TypeScript
`;

      return {
        content: [{
          type: 'text',
          text: markdown
        }]
      };
    } catch (error) {
      const errorMarkdown = `## Error

Code generation failed.

### Error Details

\`\`\`
${error instanceof Error ? error.message : String(error)}
\`\`\`

### Troubleshooting

- Verify that the \`templateId\` is valid (data-analyst, content-creator, code-assistant, research-agent, or automation-agent)
- Ensure the \`agentName\` is a valid identifier
- Check that all required parameters are provided

### Need Help?

Try re-running the generation with a different template or contact support.
`;

      return {
        content: [{
          type: 'text',
          text: errorMarkdown
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
        const errors = validationResult.error.errors.map(err =>
          `- **${err.path.join('.')}**: ${err.message}`
        ).join('\n');

        const errorMarkdown = `## Error

Invalid requirements provided.

### Validation Errors

${errors}

### Troubleshooting

- Review the requirements object structure
- Ensure all required fields are present
- Check that enum values match allowed options
- Verify data types match the schema

### Need Help?

Consult the requirements schema documentation or provide complete interview responses.
`;

        return {
          content: [{
            type: 'text',
            text: errorMarkdown
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

      const wordCount = prompt.split(/\s+/).length;
      const sections = prompt.split('\n## ').length - 1;

      // Build Markdown document
      const markdown = `## System Prompt Generated

### File: \`system-prompt.md\`

\`\`\`markdown
${prompt}
\`\`\`

**To use**: Copy the above prompt to your agent's system prompt configuration.

## Prompt Metadata

- **Template**: ${input.templateId}
- **Agent Name**: ${input.requirements.name}
- **Word Count**: ${wordCount}
- **Sections**: ${sections}
- **Verbosity Level**: ${input.verbosityLevel || 'standard'}
- **Includes Examples**: ${input.includeExamples ? 'Yes' : 'No'}
- **Includes Constraints**: ${input.includeConstraints ? 'Yes' : 'No'}

## Next Steps

1. Review the generated system prompt carefully
2. Customize specific sections to match your exact needs
3. Test the prompt with sample user interactions
4. Update your agent configuration file with the prompt
5. Iterate based on agent performance
`;

      return {
        content: [{
          type: 'text',
          text: markdown
        }]
      };
    } catch (error) {
      const errorMarkdown = `## Error

System prompt generation failed.

### Error Details

\`\`\`
${error instanceof Error ? error.message : String(error)}
\`\`\`

### Troubleshooting

- Verify that the \`templateId\` is valid
- Ensure requirements are complete and valid
- Check that verbosity level is one of: concise, standard, detailed

### Need Help?

Try generating with a different template or simplifying requirements.
`;

      return {
        content: [{
          type: 'text',
          text: errorMarkdown
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
        const errors = validationResult.error.errors.map(err =>
          `- **${err.path.join('.')}**: ${err.message}`
        ).join('\n');

        const errorMarkdown = `## Error

Invalid requirements provided.

### Validation Errors

${errors}

### Troubleshooting

- Review the requirements object structure
- Ensure all required fields are present
- Check that enum values match allowed options
- Verify data types match the schema

### Need Help?

Consult the requirements schema documentation or provide complete interview responses.
`;

        return {
          content: [{
            type: 'text',
            text: errorMarkdown
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
      const fileDescriptions: Record<string, string> = {
        'agent.config.json': 'Agent configuration',
        '.env.example': 'Environment variables template',
        'package.json': 'Project dependencies and scripts',
        'tsconfig.json': 'TypeScript compiler configuration',
        'README.md': 'Project documentation',
        'IMPLEMENTATION.md': 'Implementation guide'
      };

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

      // Build Markdown document with all files
      let markdown = `## Configuration Files Generated\n\n`;

      // Add each file as a code block
      for (const [filename, content] of Object.entries(files)) {
        const ext = filename.split('.').pop();
        let language = 'text';

        if (filename.endsWith('.json')) language = 'json';
        else if (filename.endsWith('.md')) language = 'markdown';
        else if (filename.endsWith('.env') || filename === '.env.example') language = 'bash';
        else if (filename.endsWith('.ts')) language = 'typescript';

        markdown += `### File: \`${filename}\`\n\n`;
        markdown += `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
        markdown += `**To use**: Copy the above content to \`${filename}\` in your project root.\n\n`;
      }

      // Add summary section
      markdown += `## Files Generated Summary\n\n`;
      Object.keys(files).forEach((filename, index) => {
        const description = fileDescriptions[filename] || 'Configuration file';
        markdown += `${index + 1}. \`${filename}\` - ${description}\n`;
      });

      // Add next steps
      markdown += `\n## Next Steps\n\n`;
      markdown += `1. Create a new project directory\n`;
      markdown += `2. Copy each file above to its specified location\n`;
      markdown += `3. Run \`npm install\` to install dependencies\n`;
      markdown += `4. Review and customize configurations as needed\n`;
      markdown += `5. Begin implementing tool logic in \`src/index.ts\`\n`;

      return {
        content: [{
          type: 'text',
          text: markdown
        }]
      };
    } catch (error) {
      const errorMarkdown = `## Error

Configuration file generation failed.

### Error Details

\`\`\`
${error instanceof Error ? error.message : String(error)}
\`\`\`

### Troubleshooting

- Verify that the \`templateId\` is valid
- Ensure requirements are complete and valid
- Check that all required fields are present
- Verify file types are valid options

### Need Help?

Try generating with a different template or fewer files initially.
`;

      return {
        content: [{
          type: 'text',
          text: errorMarkdown
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
