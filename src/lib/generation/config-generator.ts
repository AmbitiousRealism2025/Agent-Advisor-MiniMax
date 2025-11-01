import { getTemplateById } from '../../templates/index.js';
import { getMinimaxConfig } from '../../utils/minimax-config.js';
import type { AgentRequirements, AgentRecommendations } from '../../types/agent.js';

export interface ConfigGenerationOptions {
  templateId: string;
  agentName: string;
  requirements: AgentRequirements;
  recommendations?: AgentRecommendations;
  projectName?: string;
}

export class ConfigGenerator {
  /**
   * Generate agent configuration JSON
   */
  generateAgentConfigJSON(options: ConfigGenerationOptions): string {
    const template = getTemplateById(options.templateId);
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }

    const config = {
      name: options.agentName,
      description: options.requirements.description,
      version: '1.0.0',
      template: {
        id: template.id,
        name: template.name
      },
      agent: {
        model: 'MiniMax-M2',
        baseUrl: 'https://api.minimax.io/anthropic',
        systemPrompt: template.systemPrompt.substring(0, 500) + '...',
        interactionStyle: options.requirements.interactionStyle
      },
      tools: template.defaultTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        permissions: tool.requiredPermissions
      })),
      capabilities: options.requirements.capabilities,
      environment: {
        runtime: options.requirements.environment?.runtime || 'local',
        deploymentTargets: options.requirements.environment?.deploymentTargets || [],
        complianceRequirements: options.requirements.environment?.complianceRequirements || []
      },
      dependencies: template.requiredDependencies,
      integrations: template.recommendedIntegrations,
      mcpServers: options.recommendations?.mcpServers || [],
      metadata: {
        createdAt: new Date().toISOString(),
        targetAudience: options.requirements.targetAudience,
        successMetrics: options.requirements.successMetrics,
        estimatedComplexity: options.recommendations?.estimatedComplexity || 'medium'
      }
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Generate .env file template
   */
  generateEnvFile(options: ConfigGenerationOptions): string {
    const lines: string[] = [];

    lines.push('# MiniMax API Configuration');
    lines.push('# REQUIRED: Your MiniMax JWT token for authentication');
    lines.push('MINIMAX_JWT_TOKEN=your_jwt_token_here');
    lines.push('');

    lines.push('# Optional: Path to Claude CLI (if using advanced features)');
    lines.push('# CLI_PATH=/path/to/claude-cli');
    lines.push('');

    lines.push('# Logging Configuration');
    lines.push('LOG_LEVEL=info');
    lines.push('NODE_ENV=development');
    lines.push('');

    // Add template-specific environment variables
    const template = getTemplateById(options.templateId);
    if (template) {
      if (template.capabilityTags.includes('web-access')) {
        lines.push('# Web Access Configuration');
        lines.push('# USER_AGENT=Mozilla/5.0 (compatible; AgentBot/1.0)');
        lines.push('# REQUEST_TIMEOUT=30000');
        lines.push('');
      }

      if (template.capabilityTags.includes('file-access')) {
        lines.push('# File Access Configuration');
        lines.push('# WORKSPACE_PATH=./workspace');
        lines.push('# MAX_FILE_SIZE=10485760');
        lines.push('');
      }

      if (template.id === 'data-analyst') {
        lines.push('# Data Analysis Configuration');
        lines.push('# MAX_ROWS=100000');
        lines.push('# DEFAULT_DELIMITER=,');
        lines.push('');
      }
    }

    // Add MCP server configurations
    if (options.recommendations?.mcpServers && options.recommendations.mcpServers.length > 0) {
      lines.push('# MCP Server Configuration');
      options.recommendations.mcpServers.forEach(server => {
        if (server.authentication === 'apiKey') {
          lines.push(`# ${server.name.toUpperCase()}_API_KEY=your_api_key_here`);
        }
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate package.json
   */
  generatePackageJSON(options: ConfigGenerationOptions): string {
    const template = getTemplateById(options.templateId);
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }

    const projectName = options.projectName || this.toKebabCase(options.agentName);

    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: options.requirements.description,
      type: 'module',
      main: 'dist/index.js',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
        test: 'vitest',
        'test:coverage': 'vitest --coverage',
        lint: 'eslint src',
        'lint:fix': 'eslint src --fix',
        typecheck: 'tsc --noEmit'
      },
      dependencies: {
        '@anthropic-ai/claude-agent-sdk': '^1.0.0',
        zod: '^3.22.0',
        dotenv: '^16.0.0',
        ...this.getTemplateDependencies(template)
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.3.0',
        tsx: '^4.7.0',
        vitest: '^1.0.0',
        '@vitest/coverage-v8': '^1.0.0',
        eslint: '^8.56.0',
        '@typescript-eslint/eslint-plugin': '^6.19.0',
        '@typescript-eslint/parser': '^6.19.0'
      },
      engines: {
        node: '>=18.0.0'
      },
      keywords: [
        'agent',
        'claude',
        'minimax',
        template.id,
        ...template.capabilityTags
      ],
      author: '',
      license: 'MIT'
    };

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generate tsconfig.json
   */
  generateTSConfig(): string {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'node',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: false,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts']
    };

    return JSON.stringify(tsConfig, null, 2);
  }

  /**
   * Generate README.md
   */
  generateREADME(options: ConfigGenerationOptions): string {
    const template = getTemplateById(options.templateId);
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }

    const lines: string[] = [];

    lines.push(`# ${options.agentName}`);
    lines.push('');
    lines.push(options.requirements.description);
    lines.push('');

    lines.push('## Overview');
    lines.push('');
    lines.push(`This agent is built using the **${template.name}** template and powered by the Claude Agent SDK with MiniMax API integration.`);
    lines.push('');

    lines.push('## Features');
    lines.push('');
    template.idealFor.forEach(feature => {
      lines.push(`- ${feature}`);
    });
    lines.push('');

    lines.push('## Tools');
    lines.push('');
    template.defaultTools.forEach(tool => {
      lines.push(`### ${tool.name}`);
      lines.push(tool.description);
      lines.push('');
    });

    lines.push('## Prerequisites');
    lines.push('');
    lines.push('- Node.js 18 or higher');
    lines.push('- MiniMax API JWT token');
    lines.push('- npm or yarn package manager');
    lines.push('');

    lines.push('## Installation');
    lines.push('');
    lines.push('```bash');
    lines.push('# Install dependencies');
    lines.push('npm install');
    lines.push('```');
    lines.push('');

    lines.push('## Configuration');
    lines.push('');
    lines.push('1. Copy `.env.example` to `.env`');
    lines.push('2. Add your MiniMax JWT token:');
    lines.push('   ```');
    lines.push('   MINIMAX_JWT_TOKEN=your_jwt_token_here');
    lines.push('   ```');
    lines.push('');

    lines.push('## Usage');
    lines.push('');
    lines.push('```bash');
    lines.push('# Development mode with hot reload');
    lines.push('npm run dev');
    lines.push('');
    lines.push('# Build for production');
    lines.push('npm run build');
    lines.push('');
    lines.push('# Run production build');
    lines.push('npm start');
    lines.push('');
    lines.push('# Run tests');
    lines.push('npm test');
    lines.push('```');
    lines.push('');

    lines.push('## Project Structure');
    lines.push('');
    lines.push('```');
    lines.push('src/');
    lines.push('├── index.ts         # Main agent entry point');
    lines.push('├── config.ts        # Configuration management');
    lines.push('├── tools/           # Tool implementations');
    lines.push('└── types/           # TypeScript type definitions');
    lines.push('```');
    lines.push('');

    if (options.recommendations?.implementationSteps) {
      lines.push('## Implementation Steps');
      lines.push('');
      options.recommendations.implementationSteps.forEach((step, idx) => {
        lines.push(`${idx + 1}. ${step}`);
      });
      lines.push('');
    }

    lines.push('## Success Metrics');
    lines.push('');
    options.requirements.successMetrics.forEach(metric => {
      lines.push(`- ${metric}`);
    });
    lines.push('');

    lines.push('## Target Audience');
    lines.push('');
    lines.push(options.requirements.targetAudience.join(', '));
    lines.push('');

    lines.push('## License');
    lines.push('');
    lines.push('MIT');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Generated by Agent Advisor MVP*');

    return lines.join('\n');
  }

  /**
   * Generate implementation guide
   */
  generateImplementationGuide(options: ConfigGenerationOptions): string {
    const template = getTemplateById(options.templateId);
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }

    const lines: string[] = [];

    lines.push(`# ${options.agentName} - Implementation Guide`);
    lines.push('');

    lines.push('## Quick Start');
    lines.push('');
    lines.push('1. **Setup Environment**');
    lines.push('   - Ensure Node.js 18+ is installed');
    lines.push('   - Run `npm install` to install dependencies');
    lines.push('   - Configure `.env` file with your MiniMax JWT token');
    lines.push('');

    lines.push('2. **Understand the Template**');
    lines.push(`   - This project uses the **${template.name}** template`);
    lines.push(`   - Template ID: \`${template.id}\``);
    lines.push(`   - Complexity: ${options.recommendations?.estimatedComplexity || 'medium'}`);
    lines.push('');

    lines.push('3. **Review Tools**');
    template.defaultTools.forEach(tool => {
      lines.push(`   - **${tool.name}**: ${tool.description}`);
    });
    lines.push('');

    if (options.recommendations?.implementationSteps) {
      lines.push('## Implementation Roadmap');
      lines.push('');
      options.recommendations.implementationSteps.forEach((step, idx) => {
        lines.push(`### Step ${idx + 1}: ${step}`);
        lines.push('');
        lines.push('**Status**: ⬜ Not Started');
        lines.push('');
      });
    }

    lines.push('## Testing Strategy');
    lines.push('');
    lines.push('1. Unit test each tool implementation');
    lines.push('2. Integration tests for tool combinations');
    lines.push('3. End-to-end tests for complete workflows');
    lines.push('4. Performance benchmarks for critical paths');
    lines.push('');

    if (options.requirements.constraints && options.requirements.constraints.length > 0) {
      lines.push('## Constraints to Consider');
      lines.push('');
      options.requirements.constraints.forEach(constraint => {
        lines.push(`- ${constraint}`);
      });
      lines.push('');
    }

    lines.push('## Deployment Checklist');
    lines.push('');
    lines.push('- [ ] All tools implemented and tested');
    lines.push('- [ ] Error handling in place');
    lines.push('- [ ] Environment variables documented');
    lines.push('- [ ] Performance optimized');
    lines.push('- [ ] Security review completed');
    lines.push('- [ ] Documentation updated');
    lines.push('- [ ] CI/CD pipeline configured');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get template-specific dependencies
   */
  private getTemplateDependencies(template: any): Record<string, string> {
    const deps: Record<string, string> = {};

    if (template.capabilityTags.includes('web-access')) {
      deps['undici'] = '^6.0.0';
    }

    if (template.capabilityTags.includes('file-access')) {
      deps['fs-extra'] = '^11.0.0';
    }

    if (template.id === 'data-analyst') {
      deps['csv-parse'] = '^5.5.0';
      deps['csv-stringify'] = '^6.4.0';
    }

    return deps;
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
