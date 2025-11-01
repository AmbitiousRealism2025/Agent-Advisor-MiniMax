import { z } from 'zod';
import { createTemplate, type ToolSchemaDefinition } from './template-types.js';

/**
 * Automation Agent Template
 * Specializes in task orchestration, workflow automation, and scheduled execution
 */

// Tool 1: schedule_task
const scheduleTaskTool: ToolSchemaDefinition = {
  name: 'schedule_task',
  description: 'Schedule a task for future execution with cron-like syntax',
  zodSchema: z.object({
    taskId: z.string().describe('Unique identifier for the task'),
    taskName: z.string().describe('Human-readable task name'),
    schedule: z.string().describe('Cron expression or time specification (e.g., "0 9 * * *" for daily at 9am)'),
    action: z.object({
      type: z.enum(['function', 'workflow', 'api-call', 'command']).describe('Type of action to execute'),
      target: z.string().describe('Function name, workflow ID, API endpoint, or command'),
      parameters: z.record(z.any()).optional().describe('Parameters to pass to the action'),
    }),
    options: z
      .object({
        timezone: z.string().optional().default('UTC'),
        retryOnFailure: z.boolean().optional().default(true),
        maxRetries: z.number().optional().default(3),
        notifyOnComplete: z.boolean().optional().default(false),
        enabled: z.boolean().optional().default(true),
      })
      .optional(),
  }),
  requiredPermissions: ['task:schedule'],
};

// Tool 2: execute_workflow
const executeWorkflowTool: ToolSchemaDefinition = {
  name: 'execute_workflow',
  description: 'Execute a multi-step workflow with conditional logic',
  zodSchema: z.object({
    workflowId: z.string().describe('Workflow identifier'),
    steps: z
      .array(
        z.object({
          stepId: z.string(),
          name: z.string(),
          action: z.object({
            type: z.enum(['function', 'api-call', 'wait', 'conditional', 'parallel']),
            config: z.record(z.any()),
          }),
          onSuccess: z.string().optional().describe('Next step ID on success'),
          onFailure: z.string().optional().describe('Next step ID on failure'),
          timeout: z.number().optional().describe('Timeout in seconds'),
        })
      )
      .describe('Ordered workflow steps'),
    input: z.record(z.any()).optional().describe('Initial workflow input data'),
    options: z
      .object({
        continueOnError: z.boolean().optional().default(false),
        saveState: z.boolean().optional().default(true),
        parallelExecution: z.boolean().optional().default(false),
      })
      .optional(),
  }),
  requiredPermissions: ['task:execute', 'compute'],
};

// Tool 3: monitor_status
const monitorStatusTool: ToolSchemaDefinition = {
  name: 'monitor_status',
  description: 'Monitor and report on task and workflow execution status',
  zodSchema: z.object({
    targets: z
      .array(
        z.object({
          type: z.enum(['task', 'workflow', 'scheduled-job']),
          id: z.string(),
        })
      )
      .describe('Tasks/workflows to monitor'),
    options: z
      .object({
        includeHistory: z.boolean().optional().default(false).describe('Include execution history'),
        includeLogs: z.boolean().optional().default(false).describe('Include execution logs'),
        includeMetrics: z.boolean().optional().default(true).describe('Include performance metrics'),
        timeRange: z
          .object({
            start: z.string().optional(),
            end: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
  requiredPermissions: ['task:read'],
};

// Tool 4: manage_queue
const manageQueueTool: ToolSchemaDefinition = {
  name: 'manage_queue',
  description: 'Manage task queues and job processing',
  zodSchema: z.object({
    queueName: z.string().describe('Queue identifier'),
    operation: z.enum(['create', 'delete', 'pause', 'resume', 'purge', 'list']).describe('Queue operation'),
    config: z
      .object({
        priority: z.number().optional().describe('Queue priority (higher = more important)'),
        concurrency: z.number().optional().default(1).describe('Max concurrent jobs'),
        rateLimit: z
          .object({
            maxJobs: z.number(),
            perSeconds: z.number(),
          })
          .optional()
          .describe('Rate limiting configuration'),
        retryStrategy: z
          .object({
            maxAttempts: z.number().default(3),
            backoffType: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
            initialDelay: z.number().default(1000).describe('Initial delay in ms'),
          })
          .optional(),
      })
      .optional(),
  }),
  requiredPermissions: ['queue:manage'],
};

// System prompt
const systemPrompt = `You are an expert Automation Agent specializing in task orchestration, workflow automation, and scheduled execution.

Your capabilities include:
- Scheduling recurring tasks with cron-like expressions
- Orchestrating complex multi-step workflows with conditional logic
- Monitoring task execution status and performance metrics
- Managing task queues with priority and rate limiting

Workflow design principles:
1. Break complex processes into atomic, reusable steps
2. Handle errors gracefully with retry logic and fallbacks
3. Maintain idempotency for safe re-execution
4. Log comprehensively for debugging and auditing
5. Use timeouts to prevent hanging operations

Task scheduling best practices:
- Use appropriate cron expressions for frequency
- Consider timezone implications for global systems
- Implement exponential backoff for retries
- Monitor resource usage and adjust concurrency
- Maintain visibility with status monitoring and alerts

Error handling strategy:
- Distinguish between transient and permanent failures
- Implement circuit breakers for external dependencies
- Provide clear error messages with actionable context
- Save workflow state for recovery and resumption
- Notify appropriate parties on critical failures

Performance optimization:
- Parallelize independent operations when possible
- Use appropriate queue priorities
- Implement rate limiting to prevent overload
- Cache results when safe and beneficial
- Monitor and optimize resource utilization

Interaction style:
- Task-focused and systematic
- Provide clear status updates and progress tracking
- Report both successes and failures transparently
- Suggest optimizations when inefficiencies detected
- Ask for clarification on error handling preferences

Always prioritize reliability, observability, and graceful degradation in automation workflows.`;

// Starter code
const starterCode = `import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Workflow execution utilities
interface WorkflowState {
  workflowId: string;
  currentStep: string;
  data: Record<string, any>;
  completedSteps: string[];
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: Date;
  errors: any[];
}

class WorkflowEngine {
  private workflows: Map<string, WorkflowState> = new Map();

  async executeStep(step: any, state: WorkflowState): Promise<any> {
    console.log(\`Executing step: \${step.name}\`);

    try {
      // Simulate step execution based on type
      switch (step.action.type) {
        case 'function':
          return await this.executeFunction(step.action.config, state.data);
        case 'api-call':
          return await this.executeApiCall(step.action.config);
        case 'wait':
          return await this.executeWait(step.action.config.duration);
        case 'conditional':
          return this.evaluateCondition(step.action.config, state.data);
        default:
          throw new Error(\`Unknown step type: \${step.action.type}\`);
      }
    } catch (error) {
      console.error(\`Step \${step.name} failed:\`, error);
      throw error;
    }
  }

  private async executeFunction(config: any, data: any): Promise<any> {
    // Execute a function with provided data
    return { success: true, result: 'Function executed' };
  }

  private async executeApiCall(config: any): Promise<any> {
    // Make an API call
    return { success: true, result: 'API call completed' };
  }

  private async executeWait(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  private evaluateCondition(config: any, data: any): boolean {
    // Evaluate conditional logic
    return true;
  }
}

// Task scheduler (simplified - use node-cron or similar in production)
class TaskScheduler {
  private tasks: Map<string, any> = new Map();

  schedule(taskId: string, cronExpression: string, task: any): void {
    console.log(\`Scheduled task \${taskId} with cron: \${cronExpression}\`);
    this.tasks.set(taskId, {
      id: taskId,
      cron: cronExpression,
      task,
      lastRun: null,
      nextRun: this.calculateNextRun(cronExpression),
    });
  }

  private calculateNextRun(cron: string): Date {
    // Simplified - use cron-parser in production
    return new Date(Date.now() + 3600000); // 1 hour from now
  }

  list(): any[] {
    return Array.from(this.tasks.values());
  }
}

const workflowEngine = new WorkflowEngine();
const scheduler = new TaskScheduler();

// Create the Automation Agent
const automationAgent = new Agent({
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN!,
  model: 'MiniMax-M2',

  systemPrompt: \`${systemPrompt}\`,

  tools: [
    {
      name: 'schedule_task',
      description: 'Schedule a task for future execution',
      input_schema: z.object({
        taskId: z.string(),
        taskName: z.string(),
        schedule: z.string(),
        action: z.object({
          type: z.enum(['function', 'workflow', 'api-call', 'command']),
          target: z.string(),
          parameters: z.record(z.any()).optional(),
        }),
        options: z.object({
          timezone: z.string().optional().default('UTC'),
          retryOnFailure: z.boolean().optional().default(true),
          maxRetries: z.number().optional().default(3),
          notifyOnComplete: z.boolean().optional().default(false),
          enabled: z.boolean().optional().default(true),
        }).optional(),
      }),
      handler: async ({ taskId, taskName, schedule, action, options = {} }) => {
        try {
          scheduler.schedule(taskId, schedule, { taskName, action, options });

          return {
            success: true,
            taskId,
            taskName,
            schedule,
            nextRun: new Date(Date.now() + 3600000).toISOString(),
            message: \`Task "\${taskName}" scheduled successfully\`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Scheduling failed',
          };
        }
      },
    },

    {
      name: 'execute_workflow',
      description: 'Execute a multi-step workflow',
      input_schema: z.object({
        workflowId: z.string(),
        steps: z.array(z.object({
          stepId: z.string(),
          name: z.string(),
          action: z.object({
            type: z.enum(['function', 'api-call', 'wait', 'conditional', 'parallel']),
            config: z.record(z.any()),
          }),
          onSuccess: z.string().optional(),
          onFailure: z.string().optional(),
          timeout: z.number().optional(),
        })),
        input: z.record(z.any()).optional(),
        options: z.object({
          continueOnError: z.boolean().optional().default(false),
          saveState: z.boolean().optional().default(true),
          parallelExecution: z.boolean().optional().default(false),
        }).optional(),
      }),
      handler: async ({ workflowId, steps, input = {}, options = {} }) => {
        const state: WorkflowState = {
          workflowId,
          currentStep: steps[0]?.stepId,
          data: input,
          completedSteps: [],
          status: 'running',
          startedAt: new Date(),
          errors: [],
        };

        try {
          for (const step of steps) {
            state.currentStep = step.stepId;

            try {
              const result = await workflowEngine.executeStep(step, state);
              state.data = { ...state.data, [\`step_\${step.stepId}_result\`]: result };
              state.completedSteps.push(step.stepId);
            } catch (error) {
              state.errors.push({ step: step.stepId, error });

              if (!options.continueOnError) {
                state.status = 'failed';
                break;
              }
            }
          }

          if (state.status === 'running') {
            state.status = 'completed';
          }

          return {
            success: state.status === 'completed',
            workflowId,
            status: state.status,
            completedSteps: state.completedSteps.length,
            totalSteps: steps.length,
            duration: Date.now() - state.startedAt.getTime(),
            errors: state.errors,
            message: \`Workflow \${state.status}: \${state.completedSteps.length}/\${steps.length} steps completed\`,
          };
        } catch (error) {
          return {
            success: false,
            workflowId,
            error: error instanceof Error ? error.message : 'Workflow execution failed',
          };
        }
      },
    },

    {
      name: 'monitor_status',
      description: 'Monitor task and workflow status',
      input_schema: z.object({
        targets: z.array(z.object({
          type: z.enum(['task', 'workflow', 'scheduled-job']),
          id: z.string(),
        })),
        options: z.object({
          includeHistory: z.boolean().optional().default(false),
          includeLogs: z.boolean().optional().default(false),
          includeMetrics: z.boolean().optional().default(true),
          timeRange: z.object({
            start: z.string().optional(),
            end: z.string().optional(),
          }).optional(),
        }).optional(),
      }),
      handler: async ({ targets, options = {} }) => {
        const statuses = targets.map(target => {
          const status = {
            type: target.type,
            id: target.id,
            status: 'running' as const,
            lastExecuted: new Date().toISOString(),
            metrics: options.includeMetrics ? {
              totalExecutions: 42,
              successRate: 0.95,
              avgDuration: 1250,
              lastDuration: 1100,
            } : undefined,
          };

          return status;
        });

        return {
          success: true,
          targets: statuses.length,
          statuses,
          message: \`Monitoring \${statuses.length} targets\`,
        };
      },
    },

    {
      name: 'manage_queue',
      description: 'Manage task queues',
      input_schema: z.object({
        queueName: z.string(),
        operation: z.enum(['create', 'delete', 'pause', 'resume', 'purge', 'list']),
        config: z.object({
          priority: z.number().optional(),
          concurrency: z.number().optional().default(1),
          rateLimit: z.object({
            maxJobs: z.number(),
            perSeconds: z.number(),
          }).optional(),
          retryStrategy: z.object({
            maxAttempts: z.number().default(3),
            backoffType: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
            initialDelay: z.number().default(1000),
          }).optional(),
        }).optional(),
      }),
      handler: async ({ queueName, operation, config = {} }) => {
        console.log(\`Queue operation: \${operation} on \${queueName}\`);

        const operationResults: Record<string, any> = {
          create: { created: true, queueName, config },
          delete: { deleted: true, queueName },
          pause: { paused: true, queueName },
          resume: { resumed: true, queueName },
          purge: { purged: true, itemsRemoved: 0 },
          list: { queues: [{ name: queueName, size: 0, status: 'active' }] },
        };

        return {
          success: true,
          operation,
          result: operationResults[operation],
          message: \`Queue operation '\${operation}' completed on \${queueName}\`,
        };
      },
    },
  ],
});

// Example usage
async function main() {
  const query = process.argv[2] || 'Schedule a daily task to backup database at 2am UTC';

  console.log('Automation Agent Query:', query);
  console.log('---');

  const response = automationAgent.query(query);

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
export const automationAgentTemplate = createTemplate(
  {
    id: 'automation-agent',
    name: 'Automation Agent',
    description:
      'Specializes in task orchestration, workflow automation, scheduled execution, and queue management. Ideal for process automation, batch processing, and system integration.',
    capabilityTags: ['automation', 'orchestration', 'scheduling', 'workflows', 'task-management'],
    idealFor: [
      'Scheduled task execution and cron jobs',
      'Multi-step workflow orchestration',
      'Batch processing and data pipelines',
      'System integration and API orchestration',
      'DevOps automation and CI/CD tasks',
    ],
    systemPrompt,
    requiredDependencies: [
      '@anthropic-ai/claude-agent-sdk',
      'zod',
      'node-cron', // For scheduling
      'bull', // For queue management (or BullMQ)
    ],
    recommendedIntegrations: [
      'Task queues (Bull, RabbitMQ, Redis)',
      'Workflow engines (Temporal, Airflow)',
      'CI/CD platforms (GitHub Actions, Jenkins)',
      'Monitoring systems (Prometheus, Grafana)',
    ],
  },
  [scheduleTaskTool, executeWorkflowTool, monitorStatusTool, manageQueueTool]
);
