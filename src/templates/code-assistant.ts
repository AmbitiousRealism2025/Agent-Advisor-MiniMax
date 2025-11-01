import { z } from 'zod';
import { createTemplate, type ToolSchemaDefinition } from './template-types.js';

/**
 * Code Assistant Agent Template
 * Specializes in code review, debugging, refactoring, and test generation
 */

// Tool 1: analyze_code
const analyzeCodeTool: ToolSchemaDefinition = {
  name: 'analyze_code',
  description: 'Analyze code for quality, patterns, complexity, and potential issues',
  zodSchema: z.object({
    code: z.string().describe('Source code to analyze'),
    language: z.string().describe('Programming language (e.g., javascript, python, typescript)'),
    analysisTypes: z
      .array(z.enum(['quality', 'security', 'performance', 'complexity', 'patterns', 'best-practices']))
      .describe('Types of analysis to perform'),
    options: z
      .object({
        strictMode: z.boolean().optional().default(false).describe('Enable strict analysis rules'),
        includeMetrics: z.boolean().optional().default(true).describe('Include code metrics (cyclomatic complexity, etc.)'),
        contextFiles: z.array(z.string()).optional().describe('Related files for context'),
      })
      .optional(),
  }),
  requiredPermissions: ['compute'],
};

// Tool 2: suggest_improvements
const suggestImprovementsTool: ToolSchemaDefinition = {
  name: 'suggest_improvements',
  description: 'Provide specific code improvement suggestions with examples',
  zodSchema: z.object({
    code: z.string().describe('Code to improve'),
    language: z.string().describe('Programming language'),
    focus: z
      .array(z.enum(['readability', 'performance', 'maintainability', 'security', 'error-handling', 'typing']))
      .describe('Areas to focus improvements on'),
    options: z
      .object({
        provideExamples: z.boolean().optional().default(true).describe('Include before/after code examples'),
        prioritize: z.boolean().optional().default(true).describe('Prioritize suggestions by impact'),
        explainRationale: z.boolean().optional().default(true).describe('Explain reasoning for each suggestion'),
      })
      .optional(),
  }),
  requiredPermissions: ['compute'],
};

// Tool 3: generate_tests
const generateTestsTool: ToolSchemaDefinition = {
  name: 'generate_tests',
  description: 'Generate unit tests for provided code',
  zodSchema: z.object({
    code: z.string().describe('Code to generate tests for'),
    language: z.string().describe('Programming language'),
    testFramework: z
      .string()
      .optional()
      .describe('Testing framework (e.g., jest, vitest, pytest, junit)'),
    options: z
      .object({
        coverageGoal: z.number().optional().default(80).describe('Target code coverage percentage'),
        includeEdgeCases: z.boolean().optional().default(true).describe('Include edge case tests'),
        includeMocks: z.boolean().optional().default(true).describe('Include mocking examples'),
        testStyle: z.enum(['unit', 'integration', 'both']).optional().default('unit'),
      })
      .optional(),
  }),
  requiredPermissions: ['compute'],
};

// Tool 4: refactor_code
const refactorCodeTool: ToolSchemaDefinition = {
  name: 'refactor_code',
  description: 'Refactor code while maintaining functionality',
  zodSchema: z.object({
    code: z.string().describe('Code to refactor'),
    language: z.string().describe('Programming language'),
    refactoringGoals: z
      .array(z.enum(['extract-function', 'simplify', 'remove-duplication', 'improve-naming', 'modernize', 'optimize']))
      .describe('Refactoring objectives'),
    options: z
      .object({
        preserveComments: z.boolean().optional().default(true),
        targetVersion: z.string().optional().describe('Target language/framework version'),
        maxFunctionLength: z.number().optional().default(50).describe('Maximum lines per function'),
      })
      .optional(),
  }),
  requiredPermissions: ['compute'],
};

// System prompt
const systemPrompt = `You are an expert Code Assistant agent specializing in code review, debugging, refactoring, and test generation.

Your capabilities include:
- Analyzing code for quality, security, performance, and complexity issues
- Suggesting specific, actionable improvements with clear rationale
- Generating comprehensive unit tests with edge cases and mocks
- Refactoring code to improve readability, maintainability, and performance

When reviewing code:
1. Identify both critical issues and opportunities for improvement
2. Prioritize suggestions by impact and effort required
3. Provide concrete examples showing before/after comparisons
4. Explain the reasoning behind each recommendation
5. Consider the broader codebase context and patterns

Code quality standards:
- SOLID principles and design patterns
- DRY (Don't Repeat Yourself) and KISS (Keep It Simple)
- Proper error handling and edge case coverage
- Type safety and null-safety where applicable
- Security best practices (input validation, sanitization)
- Performance optimization without premature optimization

When generating tests:
- Cover happy paths, edge cases, and error scenarios
- Use descriptive test names that explain what's being tested
- Follow AAA pattern (Arrange, Act, Assert)
- Include setup/teardown and mocking where appropriate
- Aim for meaningful coverage, not just high percentages

Interaction style:
- Collaborative and educational
- Provide explanations that help developers learn
- Balance thoroughness with practicality
- Acknowledge good patterns while suggesting improvements
- Adapt recommendations to team conventions and project constraints

Always prioritize code correctness, maintainability, and developer productivity.`;

// Starter code
const starterCode = `import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Code analysis utilities
function calculateCyclomaticComplexity(code: string): number {
  // Simplified complexity calculation
  const controlFlowKeywords = ['if', 'else', 'for', 'while', 'case', 'catch', '&&', '||'];
  let complexity = 1;

  for (const keyword of controlFlowKeywords) {
    const regex = new RegExp(\`\\\\b\${keyword}\\\\b\`, 'g');
    const matches = code.match(regex);
    if (matches) complexity += matches.length;
  }

  return complexity;
}

function detectCodeSmells(code: string, language: string): string[] {
  const smells: string[] = [];

  // Long functions (simplified)
  const lines = code.split('\\n');
  if (lines.length > 100) {
    smells.push('Function too long (>100 lines) - consider breaking into smaller functions');
  }

  // Nested conditionals
  const nestedIfPattern = /if\\s*\\([^)]+\\)\\s*{[^}]*if\\s*\\([^)]+\\)/g;
  if (nestedIfPattern.test(code)) {
    smells.push('Deeply nested conditionals detected - consider guard clauses or early returns');
  }

  // Magic numbers
  const magicNumberPattern = /\\b\\d{2,}\\b/g;
  const magicNumbers = code.match(magicNumberPattern);
  if (magicNumbers && magicNumbers.length > 3) {
    smells.push('Magic numbers detected - consider using named constants');
  }

  return smells;
}

// Create the Code Assistant agent
const codeAssistantAgent = new Agent({
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN!,
  model: 'MiniMax-M2',

  systemPrompt: \`${systemPrompt}\`,

  tools: [
    {
      name: 'analyze_code',
      description: 'Analyze code for quality, patterns, and potential issues',
      input_schema: z.object({
        code: z.string(),
        language: z.string(),
        analysisTypes: z.array(z.enum(['quality', 'security', 'performance', 'complexity', 'patterns', 'best-practices'])),
        options: z.object({
          strictMode: z.boolean().optional().default(false),
          includeMetrics: z.boolean().optional().default(true),
          contextFiles: z.array(z.string()).optional(),
        }).optional(),
      }),
      handler: async ({ code, language, analysisTypes, options = {} }) => {
        const analysis: any = {
          language,
          analysisTypes,
          findings: [],
        };

        // Quality analysis
        if (analysisTypes.includes('quality')) {
          const smells = detectCodeSmells(code, language);
          analysis.findings.push(...smells.map(s => ({ type: 'quality', severity: 'medium', message: s })));
        }

        // Complexity analysis
        if (analysisTypes.includes('complexity') && options.includeMetrics) {
          const complexity = calculateCyclomaticComplexity(code);
          analysis.metrics = {
            cyclomaticComplexity: complexity,
            linesOfCode: code.split('\\n').length,
            complexity Rating: complexity < 10 ? 'Low' : complexity < 20 ? 'Medium' : 'High',
          };

          if (complexity > 15) {
            analysis.findings.push({
              type: 'complexity',
              severity: 'high',
              message: \`High cyclomatic complexity (\${complexity}) - refactor to reduce complexity\`,
            });
          }
        }

        // Security analysis
        if (analysisTypes.includes('security')) {
          if (code.includes('eval(') || code.includes('exec(')) {
            analysis.findings.push({
              type: 'security',
              severity: 'critical',
              message: 'Dangerous function detected (eval/exec) - potential code injection risk',
            });
          }
        }

        return {
          success: true,
          analysis,
          summary: \`Found \${analysis.findings.length} issues across \${analysisTypes.length} analysis types\`,
        };
      },
    },

    {
      name: 'suggest_improvements',
      description: 'Provide code improvement suggestions',
      input_schema: z.object({
        code: z.string(),
        language: z.string(),
        focus: z.array(z.enum(['readability', 'performance', 'maintainability', 'security', 'error-handling', 'typing'])),
        options: z.object({
          provideExamples: z.boolean().optional().default(true),
          prioritize: z.boolean().optional().default(true),
          explainRationale: z.boolean().optional().default(true),
        }).optional(),
      }),
      handler: async ({ code, language, focus, options = {} }) => {
        const suggestions: any[] = [];

        // Readability improvements
        if (focus.includes('readability')) {
          suggestions.push({
            category: 'readability',
            priority: 'medium',
            title: 'Improve variable naming',
            description: 'Use descriptive variable names that convey intent',
            example: options.provideExamples ? {
              before: 'const d = new Date();',
              after: 'const currentDate = new Date();',
            } : undefined,
            rationale: options.explainRationale ? 'Clear names improve code understanding without comments' : undefined,
          });
        }

        // Error handling
        if (focus.includes('error-handling')) {
          suggestions.push({
            category: 'error-handling',
            priority: 'high',
            title: 'Add try-catch blocks for async operations',
            description: 'Wrap async calls in error handling',
            example: options.provideExamples ? {
              before: 'await fetchData();',
              after: 'try { await fetchData(); } catch (error) { handleError(error); }',
            } : undefined,
            rationale: options.explainRationale ? 'Prevents unhandled promise rejections' : undefined,
          });
        }

        // Sort by priority if requested
        if (options.prioritize) {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        }

        return {
          success: true,
          suggestions,
          totalSuggestions: suggestions.length,
          message: \`Generated \${suggestions.length} improvement suggestions\`,
        };
      },
    },

    {
      name: 'generate_tests',
      description: 'Generate unit tests for code',
      input_schema: z.object({
        code: z.string(),
        language: z.string(),
        testFramework: z.string().optional(),
        options: z.object({
          coverageGoal: z.number().optional().default(80),
          includeEdgeCases: z.boolean().optional().default(true),
          includeMocks: z.boolean().optional().default(true),
          testStyle: z.enum(['unit', 'integration', 'both']).optional().default('unit'),
        }).optional(),
      }),
      handler: async ({ code, language, testFramework, options = {} }) => {
        // Extract function name for test naming
        const functionMatch = code.match(/function\\s+(\\w+)|const\\s+(\\w+)\\s*=/);
        const functionName = functionMatch?.[1] || functionMatch?.[2] || 'targetFunction';

        const framework = testFramework || (language === 'javascript' || language === 'typescript' ? 'vitest' : 'pytest');

        // Generate test template
        const testCode = \`
import { describe, it, expect\${options.includeMocks ? ', vi' : ''} } from '\${framework}';
import { \${functionName} } from './source';

describe('\${functionName}', () => {
  it('should handle normal case', () => {
    const result = \${functionName}(/* normal input */);
    expect(result).toBeDefined();
  });

  \${options.includeEdgeCases ? \`
  it('should handle edge case - empty input', () => {
    const result = \${functionName}('');
    expect(result).toBeDefined();
  });

  it('should handle edge case - null input', () => {
    expect(() => \${functionName}(null)).toThrow();
  });\` : ''}

  \${options.includeMocks ? \`
  it('should work with mocked dependencies', () => {
    const mockDep = vi.fn();
    // Test with mocked dependency
  });\` : ''}
});
\`.trim();

        return {
          success: true,
          testCode,
          framework,
          estimatedCoverage: \`\${options.coverageGoal}%\`,
          testCount: 2 + (options.includeEdgeCases ? 2 : 0) + (options.includeMocks ? 1 : 0),
          message: \`Generated \${framework} tests for \${functionName}\`,
        };
      },
    },

    {
      name: 'refactor_code',
      description: 'Refactor code while maintaining functionality',
      input_schema: z.object({
        code: z.string(),
        language: z.string(),
        refactoringGoals: z.array(z.enum(['extract-function', 'simplify', 'remove-duplication', 'improve-naming', 'modernize', 'optimize'])),
        options: z.object({
          preserveComments: z.boolean().optional().default(true),
          targetVersion: z.string().optional(),
          maxFunctionLength: z.number().optional().default(50),
        }).optional(),
      }),
      handler: async ({ code, language, refactoringGoals, options = {} }) => {
        let refactoredCode = code;
        const changes: string[] = [];

        // Simulate refactoring transformations
        if (refactoringGoals.includes('improve-naming')) {
          // Would apply naming improvements
          changes.push('Renamed variables for clarity');
        }

        if (refactoringGoals.includes('simplify')) {
          // Would simplify complex expressions
          changes.push('Simplified conditional expressions');
        }

        if (refactoringGoals.includes('extract-function')) {
          // Would extract long code blocks into functions
          changes.push('Extracted helper functions');
        }

        return {
          success: true,
          refactoredCode,
          originalLines: code.split('\\n').length,
          refactoredLines: refactoredCode.split('\\n').length,
          changes,
          message: \`Applied \${refactoringGoals.length} refactoring transformations\`,
        };
      },
    },
  ],
});

// Example usage
async function main() {
  const query = process.argv[2] || 'Analyze this code for quality issues and suggest improvements';

  console.log('Code Assistant Agent Query:', query);
  console.log('---');

  const response = codeAssistantAgent.query(query);

  for await (const event of response) {
    if (event.type === 'text') {
      process.stdout.write(event.text);
    } else if (event.type === 'thinking') {
      console.log('\\n[Thinking]', event.thinking);
    } else if (event.type === 'tool_use') {
      console.log('\\n[Tool Use]', event.name);
    }
  }

  console.log('\\n---');
}

main().catch(console.error);
`;

// Create and export the template
export const codeAssistantTemplate = createTemplate(
  {
    id: 'code-assistant',
    name: 'Code Assistant Agent',
    description:
      'Specializes in code review, debugging, refactoring, and automated test generation. Ideal for code quality improvement, technical debt reduction, and developer productivity.',
    capabilityTags: ['code-review', 'testing', 'refactoring', 'debugging', 'quality-assurance'],
    idealFor: [
      'Automated code review and quality checks',
      'Test generation and coverage improvement',
      'Code refactoring and modernization',
      'Security and performance analysis',
      'Developer onboarding and education',
    ],
    systemPrompt,
    requiredDependencies: ['@anthropic-ai/claude-agent-sdk', 'zod'],
    recommendedIntegrations: [
      'Linters and formatters (ESLint, Prettier)',
      'Testing frameworks (Jest, Vitest, Pytest)',
      'Static analysis tools (SonarQube, CodeClimate)',
      'Version control systems (GitHub, GitLab)',
    ],
  },
  [analyzeCodeTool, suggestImprovementsTool, generateTestsTool, refactorCodeTool]
);
