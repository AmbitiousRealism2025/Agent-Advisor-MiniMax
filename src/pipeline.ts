import type {
  AgentRequirements,
  AgentRecommendations,
} from './types/agent.js';
import type { Response } from './types/interview.js';
import { InterviewStateManager } from './lib/interview/state-manager.js';
import { AgentClassifier } from './lib/classification/classifier.js';
import { CodeGenerator } from './lib/generation/code-generator.js';
import { PromptGenerator } from './lib/generation/prompt-generator.js';
import { ConfigGenerator } from './lib/generation/config-generator.js';
import { AgentPackager, type PackageResult } from './lib/export/packager.js';

export interface PipelineOptions {
  outputDir?: string;
  autoPackage?: boolean;
  includeExamples?: boolean;
  includeTests?: boolean;
  verboseLogging?: boolean;
  promptVerbosity?: 'concise' | 'standard' | 'detailed';
}

export interface PipelineResult {
  success: boolean;
  requirements?: AgentRequirements;
  recommendations?: AgentRecommendations;
  generatedFiles?: {
    code: string;
    prompt: string;
    packageJson: string;
    readme: string;
    implementationGuide: string;
  };
  packageResult?: PackageResult;
  errors?: string[];
  warnings?: string[];
}

export interface InteractiveCallbacks {
  onQuestion?: (question: string, hint?: string) => Promise<string>;
  onProgress?: (stage: string, message: string) => void;
  onError?: (error: string) => void;
}

/**
 * AgentGenerationPipeline - Orchestrates the complete agent generation workflow
 */
export class AgentGenerationPipeline {
  private interviewManager: InterviewStateManager;
  private classifier: AgentClassifier;
  private codeGenerator: CodeGenerator;
  private promptGenerator: PromptGenerator;
  private configGenerator: ConfigGenerator;
  private packager: AgentPackager;

  constructor() {
    this.interviewManager = new InterviewStateManager();
    this.classifier = new AgentClassifier();
    this.codeGenerator = new CodeGenerator();
    this.promptGenerator = new PromptGenerator();
    this.configGenerator = new ConfigGenerator();
    this.packager = new AgentPackager();
  }

  /**
   * Run the complete pipeline from interview to packaged agent
   */
  async runFullPipeline(
    responses: Record<string, string | boolean | string[]>,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const {
      outputDir = './generated-agents',
      autoPackage = true,
      includeExamples = true,
      includeTests = false,
      verboseLogging = false,
      promptVerbosity = 'detailed',
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Initialize interview session
      if (verboseLogging) {
        console.log('Step 1: Initializing interview session...');
      }

      this.interviewManager.initializeSession();

      // Step 2: Process all responses
      if (verboseLogging) {
        console.log('Step 2: Processing interview responses...');
      }

      for (const [questionId, response] of Object.entries(responses)) {
        try {
          this.interviewManager.recordResponse(questionId, response);
        } catch (error) {
          warnings.push(
            `Failed to process response for ${questionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Step 3: Validate and extract requirements
      if (verboseLogging) {
        console.log('Step 3: Extracting requirements...');
      }

      const requirements = this.interviewManager.getCollectedRequirements() as AgentRequirements;

      if (!requirements.name || !requirements.primaryOutcome) {
        errors.push('Failed to extract valid requirements from responses');
        return { success: false, errors };
      }

      // Step 4: Classify agent type
      if (verboseLogging) {
        console.log('Step 4: Classifying agent type...');
      }

      const recommendations = this.classifier.classify(requirements);

      if (!recommendations.agentType) {
        errors.push('Classification failed to determine agent type');
        return { success: false, requirements, errors };
      }

      // Step 5: Generate code
      if (verboseLogging) {
        console.log(`Step 5: Generating code for ${recommendations.agentType}...`);
      }

      const code = this.codeGenerator.generateFullCode({
        templateId: recommendations.agentType,
        agentName: requirements.name,
        includeComments: true,
        includeErrorHandling: true,
        includeSampleUsage: includeExamples,
      });

      // Step 6: Generate system prompt
      if (verboseLogging) {
        console.log('Step 6: Generating system prompt...');
      }

      const prompt = this.promptGenerator.generate({
        templateId: recommendations.agentType,
        requirements,
        verbosityLevel: promptVerbosity,
      });

      // Step 7: Generate configuration files
      if (verboseLogging) {
        console.log('Step 7: Generating configuration files...');
      }

      const packageJson = this.configGenerator.generatePackageJSON({
        templateId: recommendations.agentType,
        agentName: requirements.name,
        requirements,
      });

      const readme = this.configGenerator.generateREADME({
        templateId: recommendations.agentType,
        agentName: requirements.name,
        requirements,
        recommendations,
      });

      const implementationGuide = this.configGenerator.generateImplementationGuide({
        templateId: recommendations.agentType,
        agentName: requirements.name,
        requirements,
        recommendations,
      });

      const generatedFiles = {
        code,
        prompt,
        packageJson, // Already a JSON string from generatePackageJSON
        readme,
        implementationGuide,
      };

      // Step 8: Package agent (if requested)
      let packageResult: PackageResult | undefined;

      if (autoPackage) {
        if (verboseLogging) {
          console.log('Step 8: Packaging agent project...');
        }

        const agentOutputDir = `${outputDir}/${requirements.name.toLowerCase().replace(/\s+/g, '-')}`;

        packageResult = await this.packager.packageAgent({
          outputDir: agentOutputDir,
          agentName: requirements.name,
          templateId: recommendations.agentType,
          requirements,
          recommendations,
          includeExamples,
          includeTests,
          includeDocumentation: true,
        });

        if (!packageResult.success && packageResult.errors) {
          warnings.push(...packageResult.errors);
        }
      }

      // Step 9: Return complete result
      return {
        success: true,
        requirements,
        recommendations,
        generatedFiles,
        packageResult,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      errors.push(
        `Pipeline execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { success: false, errors };
    }
  }

  /**
   * Run an interactive interview session
   */
  async runInteractiveInterview(
    callbacks: InteractiveCallbacks
  ): Promise<AgentRequirements | null> {
    const { onQuestion, onProgress, onError } = callbacks;

    try {
      this.interviewManager.initializeSession();
      const responses: Record<string, string | boolean | string[]> = {};

      while (!this.interviewManager.isComplete()) {
        const question = this.interviewManager.getCurrentQuestion();

        if (!question) {
          if (onError) {
            onError('No more questions available but interview not complete');
          }
          break;
        }

        const state = this.interviewManager.getState();
        const totalQuestions = 15;
        const currentIndex = state.currentQuestionIndex;

        if (onProgress) {
          onProgress(
            state.currentStage,
            `Question ${currentIndex + 1} of ${totalQuestions}`
          );
        }

        // Ask the question
        let response: string;
        if (onQuestion) {
          response = await onQuestion(question.text, question.hint);
        } else {
          throw new Error('No question callback provided');
        }

        // Record the response - this will automatically advance to next question
        this.interviewManager.recordResponse(question.id, response);
        responses[question.id] = response;
      }

      // Extract requirements
      const requirements = this.interviewManager.getCollectedRequirements() as AgentRequirements;

      if (!requirements.name || !requirements.primaryOutcome) {
        if (onError) {
          onError('Failed to extract valid requirements');
        }
        return null;
      }

      return requirements;
    } catch (error) {
      if (onError) {
        onError(
          error instanceof Error ? error.message : 'Unknown error during interview'
        );
      }
      return null;
    }
  }

  /**
   * Resume a saved interview session
   */
  resumeInterview(sessionId: string): boolean {
    try {
      // This would integrate with the persistence layer
      // For now, it's a stub
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get current pipeline state
   */
  getState(): {
    sessionActive: boolean;
    currentStage?: string;
    progress: number;
  } {
    const state = this.interviewManager.getState();
    const sessionActive = !state.isComplete;
    const progressInfo = this.interviewManager.getProgress();
    const currentStage = progressInfo.currentStage;
    const progress = progressInfo.total > 0
      ? (progressInfo.answered / progressInfo.total) * 100
      : 0;

    return {
      sessionActive,
      currentStage,
      progress,
    };
  }
}
