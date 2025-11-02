/**
 * E2E Test Helper Functions
 *
 * Provides simplified interfaces for E2E tests that call the actual tool handlers,
 * ensuring tests validate real tool behavior rather than mock implementations.
 */

import { GenerateAgentCodeHandler, GenerateSystemPromptHandler, GenerateConfigFilesHandler } from '../../src/lib/generation/tool-handlers.js';
import { createGenerateImplementationGuideTool } from '../../src/lib/export/tool-handler.js';
import type { AgentRequirements, AgentRecommendations } from '../../src/types/agent.js';

export interface GenerationResult {
  status: 'success' | 'error';
  markdown?: string;
  error?: string;
}

export interface CodeGenerationParams {
  requirements: AgentRequirements;
  templateId: string;
  includeComments?: boolean;
}

export interface PromptGenerationParams {
  requirements: AgentRequirements;
  templateId: string;
  verbosity?: 'concise' | 'standard' | 'detailed';
}

export interface ConfigGenerationParams {
  requirements: AgentRequirements;
  templateId: string;
}

export interface GuideGenerationParams {
  requirements: AgentRequirements;
  templateId: string;
  recommendations?: AgentRecommendations;
  generatedFiles?: Record<string, string>;
}

/**
 * Generate agent code using the actual tool handler
 */
export async function generateAgentCode(
  params: CodeGenerationParams
): Promise<GenerationResult> {
  try {
    const handler = new GenerateAgentCodeHandler();
    const result = await handler.handle({
      templateId: params.templateId,
      agentName: params.requirements.name,
      includeComments: params.includeComments ?? true,
      includeErrorHandling: true,
      includeSampleUsage: true
    });

    const markdown = result.content[0]?.text ?? '';

    // Check if result is an error
    if (markdown.includes('## Error')) {
      return {
        status: 'error',
        error: 'Code generation failed',
        markdown
      };
    }

    return {
      status: 'success',
      markdown
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      markdown: `## Error

Failed to generate agent code: ${error instanceof Error ? error.message : String(error)}
`
    };
  }
}

/**
 * Generate system prompt using the actual tool handler
 */
export async function generateSystemPrompt(
  params: PromptGenerationParams
): Promise<GenerationResult> {
  try {
    const handler = new GenerateSystemPromptHandler();
    const result = await handler.handle({
      templateId: params.templateId,
      requirements: params.requirements,
      includeExamples: params.verbosity !== 'concise',
      includeConstraints: true,
      verbosityLevel: params.verbosity ?? 'standard'
    });

    const markdown = result.content[0]?.text ?? '';

    // Check if result is an error
    if (markdown.includes('## Error')) {
      return {
        status: 'error',
        error: 'System prompt generation failed',
        markdown
      };
    }

    return {
      status: 'success',
      markdown
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      markdown: `## Error

Failed to generate system prompt: ${error instanceof Error ? error.message : String(error)}
`
    };
  }
}

/**
 * Generate config files using the actual tool handler
 */
export async function generateConfigFiles(
  params: ConfigGenerationParams
): Promise<GenerationResult> {
  try {
    const handler = new GenerateConfigFilesHandler();
    const result = await handler.handle({
      templateId: params.templateId,
      agentName: params.requirements.name,
      requirements: params.requirements,
      files: ['package', 'tsconfig', 'env']
    });

    const markdown = result.content[0]?.text ?? '';

    // Check if result is an error
    if (markdown.includes('## Error')) {
      return {
        status: 'error',
        error: 'Config files generation failed',
        markdown
      };
    }

    return {
      status: 'success',
      markdown
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      markdown: `## Error

Failed to generate config files: ${error instanceof Error ? error.message : String(error)}
`
    };
  }
}

/**
 * Generate implementation guide using the actual tool handler
 */
export async function generateImplementationGuide(
  params: GuideGenerationParams
): Promise<GenerationResult> {
  try {
    const implementationGuideTool = createGenerateImplementationGuideTool();
    const result = await implementationGuideTool.handler({
      templateId: params.templateId,
      agentName: params.requirements.name,
      requirements: params.requirements,
      recommendations: params.recommendations || {
        agentType: params.templateId,
        requiredDependencies: [],
        mcpServers: [],
        systemPrompt: '',
        starterCode: '',
        toolConfigurations: [],
        estimatedComplexity: 'medium' as const,
        implementationSteps: []
      },
      includeReadme: true,
      includeExamples: true
    }, {});

    // Extract text from result with type guard
    const textContent = result.content.find((item: any) => item.type === 'text') as { type: 'text'; text: string } | undefined;
    const markdown: string = textContent?.text ?? '';

    // Check if result is an error
    if (markdown.includes('## Error')) {
      return {
        status: 'error',
        error: 'Implementation guide generation failed',
        markdown
      };
    }

    return {
      status: 'success',
      markdown
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      markdown: `## Error

Failed to generate implementation guide: ${error instanceof Error ? error.message : String(error)}
`
    };
  }
}
