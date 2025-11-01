import { join } from 'path';
import type { AgentRequirements, AgentRecommendations } from '../../types/agent.js';
import { CodeGenerator } from '../generation/code-generator.js';
import { PromptGenerator } from '../generation/prompt-generator.js';
import { ConfigGenerator } from '../generation/config-generator.js';
import { FileWriter, type FileWriteResult } from './file-writer.js';

export interface PackageAgentOptions {
  outputDir: string;
  agentName: string;
  templateId: string;
  requirements: AgentRequirements;
  recommendations: AgentRecommendations;
  includeExamples?: boolean;
  includeTests?: boolean;
  includeDocumentation?: boolean;
  createZip?: boolean;
}

export interface PackageManifest {
  agentName: string;
  templateId: string;
  version: string;
  createdAt: string;
  files: string[];
  dependencies: string[];
  mcpServers: string[];
}

export interface PackageResult {
  success: boolean;
  outputDir: string;
  manifest: PackageManifest;
  files: FileWriteResult[];
  zipPath?: string;
  errors?: string[];
}

/**
 * AgentPackager - Packages generated agent projects with all necessary files
 */
export class AgentPackager {
  private fileWriter: FileWriter;
  private codeGenerator: CodeGenerator;
  private promptGenerator: PromptGenerator;
  private configGenerator: ConfigGenerator;

  constructor() {
    this.fileWriter = new FileWriter();
    this.codeGenerator = new CodeGenerator();
    this.promptGenerator = new PromptGenerator();
    this.configGenerator = new ConfigGenerator();
  }

  /**
   * Package a complete agent project
   */
  async packageAgent(options: PackageAgentOptions): Promise<PackageResult> {
    const {
      outputDir,
      agentName,
      templateId,
      requirements,
      recommendations,
      includeExamples = true,
      includeTests = false,
      includeDocumentation = true,
      createZip = false,
    } = options;

    const errors: string[] = [];
    const files: FileWriteResult[] = [];

    try {
      // Ensure output directory exists
      await this.fileWriter.ensureDirectory(outputDir);

      // Create project structure
      await this.createProjectStructure(outputDir);

      // Generate core files
      const coreFiles = await this.generateCoreFiles(
        outputDir,
        agentName,
        templateId,
        requirements,
        recommendations
      );
      files.push(...coreFiles);

      // Generate configuration files
      const configFiles = await this.generateConfigFiles(
        outputDir,
        agentName,
        templateId,
        requirements
      );
      files.push(...configFiles);

      // Generate documentation if requested
      if (includeDocumentation) {
        const docFiles = await this.generateDocumentation(
          outputDir,
          agentName,
          templateId,
          requirements,
          recommendations
        );
        files.push(...docFiles);
      }

      // Generate example files if requested
      if (includeExamples) {
        const exampleFiles = await this.generateExamples(
          outputDir,
          templateId
        );
        files.push(...exampleFiles);
      }

      // Generate test scaffolding if requested
      if (includeTests) {
        const testFiles = await this.generateTestScaffolding(
          outputDir,
          agentName
        );
        files.push(...testFiles);
      }

      // Create manifest
      const manifest = this.createManifest(
        agentName,
        templateId,
        files,
        recommendations
      );

      // Write manifest
      const manifestResult = await this.fileWriter.writeFile(
        join(outputDir, 'agent-manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
      files.push(manifestResult);

      // Create ZIP if requested
      let zipPath: string | undefined;
      if (createZip) {
        // ZIP functionality is a stub for now - would require archiver package
        // zipPath = await this.createZipArchive(outputDir, agentName);
        errors.push('ZIP creation not yet implemented');
      }

      // Collect any errors from file writes
      const failedFiles = files.filter((f) => !f.success);
      if (failedFiles.length > 0) {
        errors.push(
          ...failedFiles.map((f) => `Failed to write ${f.path}: ${f.error}`)
        );
      }

      return {
        success: failedFiles.length === 0,
        outputDir,
        manifest,
        files,
        zipPath,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : 'Unknown packaging error'
      );
      return {
        success: false,
        outputDir,
        manifest: this.createManifest(agentName, templateId, [], recommendations),
        files,
        errors,
      };
    }
  }

  /**
   * Create project directory structure
   */
  private async createProjectStructure(baseDir: string): Promise<void> {
    const dirs = [
      'src',
      'src/tools',
      'src/utils',
      'examples',
      'tests',
      'docs',
    ];

    for (const dir of dirs) {
      await this.fileWriter.ensureDirectory(join(baseDir, dir));
    }
  }

  /**
   * Generate core agent files
   */
  private async generateCoreFiles(
    baseDir: string,
    agentName: string,
    templateId: string,
    requirements: AgentRequirements,
    recommendations: AgentRecommendations
  ): Promise<FileWriteResult[]> {
    const results: FileWriteResult[] = [];

    // Generate main agent code
    const agentCode = this.codeGenerator.generateFullCode({
      templateId,
      agentName,
      includeComments: true,
      includeErrorHandling: true,
      includeSampleUsage: true,
    });

    results.push(
      await this.fileWriter.writeFile(
        join(baseDir, 'src', 'agent.ts'),
        agentCode
      )
    );

    // Generate system prompt
    const systemPrompt = this.promptGenerator.generate({
      templateId,
      requirements,
      verbosityLevel: 'detailed',
    });

    results.push(
      await this.fileWriter.writeFile(
        join(baseDir, 'src', 'system-prompt.ts'),
        `export const SYSTEM_PROMPT = \`${systemPrompt}\`;\n`
      )
    );

    return results;
  }

  /**
   * Generate configuration files
   */
  private async generateConfigFiles(
    baseDir: string,
    agentName: string,
    templateId: string,
    requirements: AgentRequirements
  ): Promise<FileWriteResult[]> {
    const results: FileWriteResult[] = [];

    // package.json (already a JSON string from generatePackageJSON)
    const packageJson = this.configGenerator.generatePackageJSON({
      templateId,
      agentName,
      requirements,
    });
    results.push(
      await this.fileWriter.writeFile(
        join(baseDir, 'package.json'),
        packageJson
      )
    );

    // .env.example
    const envFile = this.configGenerator.generateEnvFile({
      templateId,
      agentName,
      requirements,
    });
    results.push(
      await this.fileWriter.writeFile(
        join(baseDir, '.env.example'),
        envFile
      )
    );

    // tsconfig.json
    const tsConfig = this.configGenerator.generateTSConfig();
    results.push(
      await this.fileWriter.writeFile(
        join(baseDir, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      )
    );

    // .gitignore
    const gitignore = `node_modules/
dist/
.env
*.log
.DS_Store
coverage/
`;
    results.push(
      await this.fileWriter.writeFile(join(baseDir, '.gitignore'), gitignore)
    );

    return results;
  }

  /**
   * Generate documentation files
   */
  private async generateDocumentation(
    baseDir: string,
    agentName: string,
    templateId: string,
    requirements: AgentRequirements,
    recommendations: AgentRecommendations
  ): Promise<FileWriteResult[]> {
    const results: FileWriteResult[] = [];

    // README.md
    const readme = this.configGenerator.generateREADME({
      templateId,
      agentName,
      requirements,
      recommendations,
    });
    results.push(
      await this.fileWriter.writeFile(join(baseDir, 'README.md'), readme)
    );

    // IMPLEMENTATION.md
    const implGuide = this.configGenerator.generateImplementationGuide({
      templateId,
      agentName,
      requirements,
      recommendations,
    });
    results.push(
      await this.fileWriter.writeFile(
        join(baseDir, 'docs', 'IMPLEMENTATION.md'),
        implGuide
      )
    );

    return results;
  }

  /**
   * Generate example files
   */
  private async generateExamples(
    baseDir: string,
    templateId: string
  ): Promise<FileWriteResult[]> {
    const results: FileWriteResult[] = [];

    // Template-specific example stub
    const exampleContent = `// Example usage for ${templateId} agent
// TODO: Add template-specific examples
`;

    results.push(
      await this.fileWriter.writeFile(
        join(baseDir, 'examples', 'example.ts'),
        exampleContent
      )
    );

    return results;
  }

  /**
   * Generate test scaffolding
   */
  private async generateTestScaffolding(
    baseDir: string,
    agentName: string
  ): Promise<FileWriteResult[]> {
    const results: FileWriteResult[] = [];

    const testContent = `import { describe, it, expect } from 'vitest';

describe('${agentName}', () => {
  it('should initialize successfully', () => {
    // TODO: Add initialization tests
    expect(true).toBe(true);
  });

  it('should handle tool calls correctly', () => {
    // TODO: Add tool call tests
    expect(true).toBe(true);
  });
});
`;

    results.push(
      await this.fileWriter.writeFile(
        join(baseDir, 'tests', 'agent.test.ts'),
        testContent
      )
    );

    return results;
  }

  /**
   * Create package manifest
   */
  private createManifest(
    agentName: string,
    templateId: string,
    files: FileWriteResult[],
    recommendations: AgentRecommendations
  ): PackageManifest {
    return {
      agentName,
      templateId,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      files: files.filter((f) => f.success).map((f) => f.path),
      dependencies: recommendations.requiredDependencies || [],
      mcpServers: recommendations.mcpServers?.map((s) => s.name) || [],
    };
  }
}
