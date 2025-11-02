import { z } from 'zod';
import { createTemplate, type ToolSchemaDefinition } from './template-types.js';

/**
 * Data Analyst Agent Template
 * Specializes in CSV data processing, statistical analysis, and report generation
 */

// Tool 1: read_csv
const readCsvTool: ToolSchemaDefinition = {
  name: 'read_csv',
  description: 'Read and parse CSV files with configurable parsing options',
  zodSchema: z.object({
    filePath: z.string().min(1).describe('Path to the CSV file to read'),
    delimiter: z.string().default(',').describe('Column delimiter character'),
    hasHeaders: z.boolean().default(true).describe('Whether the first row contains headers'),
    encoding: z.enum(['utf8', 'utf16le', 'latin1']).default('utf8').describe('File encoding'),
  }),
  requiredPermissions: ['file:read'],
};

// Tool 2: analyze_data
const analyzeDataTool: ToolSchemaDefinition = {
  name: 'analyze_data',
  description: 'Perform statistical analysis on structured data',
  zodSchema: z.object({
    data: z.array(z.record(z.unknown())).describe('Array of data records to analyze'),
    analysisType: z
      .enum(['descriptive', 'correlation', 'regression', 'distribution'])
      .describe('Type of statistical analysis to perform'),
    columns: z.array(z.string()).optional().describe('Specific columns to analyze (optional, defaults to all numeric columns)'),
    groupBy: z.string().optional().describe('Column to group data by for aggregated analysis'),
  }),
  requiredPermissions: ['compute'],
};

// Tool 3: generate_visualization
const generateVisualizationTool: ToolSchemaDefinition = {
  name: 'generate_visualization',
  description: 'Create data visualizations and charts',
  zodSchema: z.object({
    data: z.array(z.record(z.unknown())).describe('Data to visualize'),
    chartType: z
      .enum(['bar', 'line', 'scatter', 'pie', 'histogram', 'heatmap'])
      .describe('Type of chart to generate'),
    xAxis: z.string().describe('Column for x-axis'),
    yAxis: z.string().describe('Column for y-axis'),
    title: z.string().optional().describe('Chart title'),
    outputPath: z.string().describe('Path where the visualization will be saved'),
  }),
  requiredPermissions: ['file:write'],
};

// Tool 4: export_report
const exportReportTool: ToolSchemaDefinition = {
  name: 'export_report',
  description: 'Generate and export analysis reports in various formats',
  zodSchema: z.object({
    data: z.record(z.unknown()).describe('Report data including analysis results and metadata'),
    format: z.enum(['json', 'csv', 'markdown', 'html']).default('markdown').describe('Output format'),
    outputPath: z.string().describe('Path for the exported report'),
    includeMetadata: z.boolean().default(true).describe('Whether to include metadata in the report'),
  }),
  requiredPermissions: ['file:write'],
};

// System prompt
const systemPrompt = `You are an expert Data Analyst agent specializing in CSV data processing, statistical analysis, and report generation.

Your capabilities include:
- Reading and parsing CSV files with various encoding and delimiter options
- Performing descriptive statistics, correlation analysis, regression, and distribution analysis
- Generating visualizations including bar charts, line graphs, scatter plots, pie charts, histograms, and heatmaps
- Exporting comprehensive reports in JSON, CSV, HTML, or Markdown formats

When analyzing data:
1. Always validate data integrity and handle missing values appropriately
2. Provide clear statistical summaries with confidence intervals when applicable
3. Choose appropriate visualizations that best represent the data patterns
4. Include actionable insights and recommendations in reports
5. Document assumptions and limitations of the analysis

Interaction style:
- Task-focused and analytical
- Provide step-by-step explanations of analysis methods
- Alert users to data quality issues or anomalies
- Suggest additional analyses when relevant patterns are detected

Always prioritize data accuracy, statistical rigor, and clear communication of findings.`;

// Starter code
const starterCode = `import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// NOTE: Persistence is controlled by the end user. Tool handlers should
// return data and suggested destinations rather than writing files directly.

// CSV parsing utility (simplified - use a library like csv-parse in production)
async function parseCSV(
  filePath: string,
  delimiter: string = ',',
  hasHeaders: boolean = true,
  encoding: 'utf8' | 'utf16le' | 'latin1' = 'utf8'
): Promise<any[]> {
  const content = await fs.readFile(filePath, { encoding });
  const lines = content.split('\\n').filter(line => line.trim());

  if (!lines.length) return [];

  const headers = hasHeaders ? lines[0].split(delimiter) : null;
  const dataLines = headers ? lines.slice(1) : lines;

  return dataLines.map((line, idx) => {
    const values = line.split(delimiter);
    if (headers) {
      return headers.reduce((obj: any, header: string, i: number) => {
        obj[header.trim()] = values[i]?.trim();
        return obj;
      }, {});
    }
    return { row: idx, values };
  });
}

// Statistical analysis utilities
function calculateDescriptiveStats(data: any[], column: string) {
  const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
  const sorted = values.sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;

  return {
    count: values.length,
    mean: mean.toFixed(2),
    median: sorted[Math.floor(sorted.length / 2)].toFixed(2),
    min: Math.min(...values).toFixed(2),
    max: Math.max(...values).toFixed(2),
    stdDev: Math.sqrt(variance).toFixed(2),
  };
}

// Create the Data Analyst agent
const dataAnalystAgent = new Agent({
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN!,
  model: 'MiniMax-M2',

  systemPrompt: \`${systemPrompt}\`,

  tools: [
    {
      name: 'read_csv',
      description: 'Read and parse CSV files with configurable parsing options',
      input_schema: z.object({
        filePath: z.string().min(1),
        delimiter: z.string().default(','),
        hasHeaders: z.boolean().default(true),
        encoding: z.enum(['utf8', 'utf16le', 'latin1']).default('utf8'),
      }),
      handler: async ({ filePath, delimiter, hasHeaders, encoding }) => {
        try {
          const data = await parseCSV(filePath, delimiter, hasHeaders, encoding);
          return {
            success: true,
            rowCount: data.length,
            columns: Object.keys(data[0] || {}),
            preview: data.slice(0, 5),
            message: \`Successfully read \${data.length} rows from \${path.basename(filePath)}\`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error reading CSV',
          };
        }
      },
    },

    {
      name: 'analyze_data',
      description: 'Perform statistical analysis on structured data',
      input_schema: z.object({
        data: z.array(z.record(z.unknown())),
        analysisType: z.enum(['descriptive', 'correlation', 'regression', 'distribution']),
        columns: z.array(z.string()).optional(),
        groupBy: z.string().optional(),
      }),
      handler: async ({ data, analysisType, columns, groupBy }) => {
        try {
          const targetColumns = columns || Object.keys(data[0] || {});
          const results: any = { analysisType, columns: targetColumns };

          if (analysisType === 'descriptive') {
            results.statistics = {};
            for (const col of targetColumns) {
              results.statistics[col] = calculateDescriptiveStats(data, col);
            }
          }

          if (groupBy) {
            results.groupBy = groupBy;
            results.message = \`Analysis grouped by \${groupBy}\`;
          }

          return {
            success: true,
            results,
            message: \`Completed \${analysisType} analysis on \${targetColumns.length} columns\`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
          };
        }
      },
    },

    {
      name: 'generate_visualization',
      description: 'Create data visualizations and charts',
      input_schema: z.object({
        data: z.array(z.record(z.unknown())),
        chartType: z.enum(['bar', 'line', 'scatter', 'pie', 'histogram', 'heatmap']),
        xAxis: z.string(),
        yAxis: z.string(),
        title: z.string().optional(),
        outputPath: z.string(),
      }),
      handler: async ({ data, chartType, xAxis, yAxis, title, outputPath }) => {
        // In production, use a charting library like Chart.js, D3, or Plotly
        // This is a placeholder implementation
        const chartConfig = {
          type: chartType,
          xAxis,
          yAxis,
          title: title || \`\${chartType} chart\`,
          dataPoints: data.length,
        };

        return {
          success: true,
          suggestedPath: outputPath,
          config: chartConfig,
          message: \`Prepared \${chartType} chart configuration for \${data.length} data points\`,
          note: 'Return this configuration to your runtime and persist with a charting library if needed.',
        };
      },
    },

    {
      name: 'export_report',
      description: 'Generate and export analysis reports in various formats',
      input_schema: z.object({
        data: z.record(z.unknown()),
        format: z.enum(['json', 'csv', 'markdown', 'html']).default('markdown'),
        outputPath: z.string(),
        includeMetadata: z.boolean().default(true),
      }),
      handler: async ({ data, format, outputPath, includeMetadata }) => {
        try {
          let content = '';

          if (format === 'json') {
            const reportData = includeMetadata
              ? { ...data, metadata: { timestamp: new Date().toISOString() } }
              : data;
            content = JSON.stringify(reportData, null, 2);
          } else if (format === 'markdown') {
            content = \`# Analysis Report\\n\\n\`;
            if (includeMetadata) {
              content += \`**Generated:** \${new Date().toISOString()}\\n\\n\`;
            }
            content += \`## Results\\n\${JSON.stringify(data, null, 2)}\\n\`;
          } else if (format === 'html') {
            content = \`<!DOCTYPE html><html><head><title>Analysis Report</title></head><body>\`;
            content += \`<h1>Analysis Report</h1>\`;
            if (includeMetadata) {
              content += \`<p><strong>Generated:</strong> \${new Date().toISOString()}</p>\`;
            }
            content += \`<pre>\${JSON.stringify(data, null, 2)}</pre></body></html>\`;
          } else if (format === 'csv') {
            // Basic CSV export (for simple data structures)
            content = 'CSV export placeholder - implement based on data structure';
          }

          return {
            success: true,
            format,
            content,
            suggestedPath: outputPath,
            message: \`Report content prepared for \${format.toUpperCase()} format\`,
            note: 'Return this payload to your application code and decide if/where to persist it.',
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Export failed',
          };
        }
      },
    },
  ],
});

// Example usage
async function main() {
  const query = process.argv[2] || 'Read the sales_data.csv file and provide a statistical summary';

  console.log('Data Analyst Agent Query:', query);
  console.log('---');

  const response = dataAnalystAgent.query(query);

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
export const dataAnalystTemplate = createTemplate(
  {
    id: 'data-analyst',
    name: 'Data Analyst Agent',
    description:
      'Specializes in CSV data processing, statistical analysis, visualization, and report generation. Ideal for data exploration, business intelligence, and automated reporting workflows.',
    capabilityTags: ['data-processing', 'statistics', 'visualization', 'reporting', 'file-access'],
    idealFor: [
      'Automated data analysis and reporting',
      'CSV file processing and transformation',
      'Statistical analysis and insights generation',
      'Business intelligence dashboards',
      'Data quality assessment and validation',
    ],
    systemPrompt,
    requiredDependencies: [
      '@anthropic-ai/claude-agent-sdk',
      'zod',
      'csv-parse', // For production CSV parsing
      'chart.js', // For visualization (or d3, plotly)
    ],
    recommendedIntegrations: [
      'Database connectors (PostgreSQL, MySQL)',
      'Cloud storage (S3, Google Cloud Storage)',
      'BI tools (Tableau, PowerBI)',
      'Spreadsheet APIs (Google Sheets, Excel)',
    ],
  },
  [readCsvTool, analyzeDataTool, generateVisualizationTool, exportReportTool]
);
