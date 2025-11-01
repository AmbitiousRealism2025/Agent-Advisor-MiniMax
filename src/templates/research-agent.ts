import { z } from 'zod';
import { createTemplate, type ToolSchemaDefinition } from './template-types.js';

/**
 * Research Agent Template
 * Specializes in web search, content scraping, summarization, and fact-checking
 */

// Tool 1: web_search
const webSearchTool: ToolSchemaDefinition = {
  name: 'web_search',
  description: 'Search the web for information on a given topic',
  zodSchema: z.object({
    query: z.string().describe('Search query'),
    options: z
      .object({
        maxResults: z.number().optional().default(10).describe('Maximum number of results to return'),
        dateRange: z
          .enum(['day', 'week', 'month', 'year', 'all'])
          .optional()
          .default('all')
          .describe('Filter by publication date'),
        domains: z.array(z.string()).optional().describe('Restrict search to specific domains'),
        excludeDomains: z.array(z.string()).optional().describe('Exclude specific domains'),
        language: z.string().optional().default('en').describe('Search language code'),
      })
      .optional(),
  }),
  requiredPermissions: ['web:read'],
};

// Tool 2: scrape_content
const scrapeContentTool: ToolSchemaDefinition = {
  name: 'scrape_content',
  description: 'Extract and parse content from web pages',
  zodSchema: z.object({
    url: z.string().url().describe('URL to scrape'),
    selectors: z
      .object({
        title: z.string().optional().describe('CSS selector for title'),
        content: z.string().optional().describe('CSS selector for main content'),
        author: z.string().optional().describe('CSS selector for author'),
        date: z.string().optional().describe('CSS selector for publication date'),
        images: z.string().optional().describe('CSS selector for images'),
      })
      .optional()
      .describe('CSS selectors for specific elements'),
    options: z
      .object({
        extractLinks: z.boolean().optional().default(false),
        extractMetadata: z.boolean().optional().default(true),
        removeScripts: z.boolean().optional().default(true),
        maxLength: z.number().optional().describe('Maximum content length in characters'),
      })
      .optional(),
  }),
  requiredPermissions: ['web:read'],
};

// Tool 3: extract_facts
const extractFactsTool: ToolSchemaDefinition = {
  name: 'extract_facts',
  description: 'Extract key facts, claims, and data points from content',
  zodSchema: z.object({
    content: z.string().describe('Content to analyze'),
    focusAreas: z
      .array(z.enum(['statistics', 'claims', 'quotes', 'dates', 'entities', 'relationships']))
      .optional()
      .describe('Types of facts to extract'),
    options: z
      .object({
        includeSources: z.boolean().optional().default(true).describe('Include source references'),
        groupByTopic: z.boolean().optional().default(false),
        confidenceThreshold: z.number().optional().default(0.7).describe('Minimum confidence for extraction'),
      })
      .optional(),
  }),
  requiredPermissions: ['compute'],
};

// Tool 4: verify_sources
const verifySourcesTool: ToolSchemaDefinition = {
  name: 'verify_sources',
  description: 'Verify credibility and accuracy of sources and claims',
  zodSchema: z.object({
    claims: z.array(z.string()).describe('Claims or facts to verify'),
    sources: z.array(z.object({ url: z.string(), title: z.string().optional() })).describe('Source URLs to check'),
    options: z
      .object({
        checkCrossReferences: z.boolean().optional().default(true).describe('Cross-reference with multiple sources'),
        assessBias: z.boolean().optional().default(true).describe('Assess potential source bias'),
        checkRecency: z.boolean().optional().default(true).describe('Check if information is current'),
      })
      .optional(),
  }),
  requiredPermissions: ['web:read', 'compute'],
};

// System prompt
const systemPrompt = `You are an expert Research Agent specializing in web search, content analysis, summarization, and fact-checking.

Your capabilities include:
- Conducting comprehensive web searches with advanced filtering
- Extracting and parsing content from web pages
- Identifying key facts, statistics, claims, and data points
- Verifying source credibility and cross-referencing information

Research methodology:
1. Start with broad searches, then narrow based on findings
2. Prioritize authoritative and peer-reviewed sources
3. Cross-reference claims across multiple independent sources
4. Note publication dates and assess information recency
5. Identify and disclose potential biases in sources

Source evaluation criteria:
- Authority: Author credentials and publisher reputation
- Accuracy: Fact-checking and citation of sources
- Currency: Publication and update dates
- Objectivity: Bias assessment and balanced perspective
- Coverage: Depth and breadth of information

When presenting research:
1. Clearly distinguish between facts, claims, and opinions
2. Cite sources with URLs and publication dates
3. Highlight areas of consensus and controversy
4. Note limitations and gaps in available information
5. Provide confidence levels for extracted information

Interaction style:
- Thorough and systematic
- Transparent about methodology and limitations
- Present multiple perspectives on controversial topics
- Prioritize accuracy over speed
- Ask clarifying questions to focus research scope

Always maintain intellectual honesty, acknowledge uncertainty, and provide traceable sources for all claims.`;

// Starter code
const starterCode = `import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Web utilities (in production, use libraries like axios, cheerio, puppeteer)
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: string;
}

async function searchWeb(query: string, options: any = {}): Promise<SearchResult[]> {
  // Placeholder - integrate with search API (Google Custom Search, Bing, etc.)
  return [
    {
      title: \`Result for: \${query}\`,
      url: 'https://example.com/article',
      snippet: 'This is a sample search result snippet...',
      domain: 'example.com',
      publishedDate: new Date().toISOString(),
    },
  ];
}

async function scrapeUrl(url: string, selectors: any = {}, options: any = {}): Promise<any> {
  // Placeholder - use cheerio or puppeteer in production
  return {
    url,
    title: 'Scraped Page Title',
    content: 'Main content extracted from the page...',
    author: 'Author Name',
    publishedDate: '2025-01-01',
    metadata: {
      description: 'Page description',
      keywords: ['research', 'web scraping'],
    },
  };
}

function evaluateSourceCredibility(source: any): any {
  const credibilityScore = {
    authority: 0.8,
    accuracy: 0.75,
    currency: 0.9,
    objectivity: 0.7,
  };

  const overallScore = Object.values(credibilityScore).reduce((a, b) => a + b, 0) / 4;

  return {
    score: overallScore,
    rating: overallScore > 0.8 ? 'High' : overallScore > 0.6 ? 'Medium' : 'Low',
    factors: credibilityScore,
    warnings: overallScore < 0.6 ? ['Low credibility score - verify with additional sources'] : [],
  };
}

// Create the Research Agent
const researchAgent = new Agent({
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN!,
  model: 'MiniMax-M2',

  systemPrompt: \`${systemPrompt}\`,

  tools: [
    {
      name: 'web_search',
      description: 'Search the web for information',
      input_schema: z.object({
        query: z.string(),
        options: z.object({
          maxResults: z.number().optional().default(10),
          dateRange: z.enum(['day', 'week', 'month', 'year', 'all']).optional().default('all'),
          domains: z.array(z.string()).optional(),
          excludeDomains: z.array(z.string()).optional(),
          language: z.string().optional().default('en'),
        }).optional(),
      }),
      handler: async ({ query, options = {} }) => {
        try {
          const results = await searchWeb(query, options);

          return {
            success: true,
            query,
            resultsCount: results.length,
            results: results.slice(0, options.maxResults || 10),
            message: \`Found \${results.length} results for "\${query}"\`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Search failed',
          };
        }
      },
    },

    {
      name: 'scrape_content',
      description: 'Extract content from web pages',
      input_schema: z.object({
        url: z.string().url(),
        selectors: z.object({
          title: z.string().optional(),
          content: z.string().optional(),
          author: z.string().optional(),
          date: z.string().optional(),
          images: z.string().optional(),
        }).optional(),
        options: z.object({
          extractLinks: z.boolean().optional().default(false),
          extractMetadata: z.boolean().optional().default(true),
          removeScripts: z.boolean().optional().default(true),
          maxLength: z.number().optional(),
        }).optional(),
      }),
      handler: async ({ url, selectors = {}, options = {} }) => {
        try {
          const scraped = await scrapeUrl(url, selectors, options);

          if (options.maxLength && scraped.content.length > options.maxLength) {
            scraped.content = scraped.content.substring(0, options.maxLength) + '...';
            scraped.truncated = true;
          }

          return {
            success: true,
            url,
            data: scraped,
            message: \`Successfully scraped content from \${new URL(url).hostname}\`,
          };
        } catch (error) {
          return {
            success: false,
            url,
            error: error instanceof Error ? error.message : 'Scraping failed',
          };
        }
      },
    },

    {
      name: 'extract_facts',
      description: 'Extract key facts and data points from content',
      input_schema: z.object({
        content: z.string(),
        focusAreas: z.array(z.enum(['statistics', 'claims', 'quotes', 'dates', 'entities', 'relationships'])).optional(),
        options: z.object({
          includeSources: z.boolean().optional().default(true),
          groupByTopic: z.boolean().optional().default(false),
          confidenceThreshold: z.number().optional().default(0.7),
        }).optional(),
      }),
      handler: async ({ content, focusAreas = ['statistics', 'claims', 'dates'], options = {} }) => {
        const facts: any[] = [];

        // Extract statistics (simplified pattern matching)
        if (focusAreas.includes('statistics')) {
          const statPattern = /\\d+(\\.\\d+)?\\s*(percent|%|million|billion|thousand)/gi;
          const matches = content.match(statPattern);
          if (matches) {
            facts.push(...matches.map(stat => ({
              type: 'statistic',
              value: stat,
              confidence: 0.85,
            })));
          }
        }

        // Extract dates
        if (focusAreas.includes('dates')) {
          const datePattern = /\\b\\d{4}\\b|\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{4}\\b/gi;
          const dates = content.match(datePattern);
          if (dates) {
            facts.push(...dates.map(date => ({
              type: 'date',
              value: date,
              confidence: 0.9,
            })));
          }
        }

        // Filter by confidence threshold
        const filteredFacts = facts.filter(f => f.confidence >= (options.confidenceThreshold || 0.7));

        return {
          success: true,
          factsExtracted: filteredFacts.length,
          facts: filteredFacts,
          focusAreas,
          message: \`Extracted \${filteredFacts.length} facts from content\`,
        };
      },
    },

    {
      name: 'verify_sources',
      description: 'Verify source credibility and accuracy',
      input_schema: z.object({
        claims: z.array(z.string()),
        sources: z.array(z.object({
          url: z.string(),
          title: z.string().optional(),
        })),
        options: z.object({
          checkCrossReferences: z.boolean().optional().default(true),
          assessBias: z.boolean().optional().default(true),
          checkRecency: z.boolean().optional().default(true),
        }).optional(),
      }),
      handler: async ({ claims, sources, options = {} }) => {
        const verification = {
          claims: claims.length,
          sources: sources.length,
          results: [] as any[],
        };

        for (const source of sources) {
          const credibility = evaluateSourceCredibility(source);

          verification.results.push({
            url: source.url,
            title: source.title || 'Unknown',
            credibility,
            verified: credibility.score > 0.6,
            warnings: credibility.warnings,
          });
        }

        const verifiedSources = verification.results.filter(r => r.verified).length;

        return {
          success: true,
          verification,
          verifiedSources,
          totalSources: sources.length,
          overallReliability: verifiedSources / sources.length > 0.7 ? 'High' : 'Moderate',
          message: \`Verified \${verifiedSources}/ \${sources.length} sources\`,
        };
      },
    },
  ],
});

// Example usage
async function main() {
  const query = process.argv[2] || 'Research the latest developments in renewable energy technology';

  console.log('Research Agent Query:', query);
  console.log('---');

  const response = researchAgent.query(query);

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
export const researchAgentTemplate = createTemplate(
  {
    id: 'research-agent',
    name: 'Research Agent',
    description:
      'Specializes in web search, content extraction, fact-checking, and source verification. Ideal for market research, competitive analysis, and information gathering.',
    capabilityTags: ['research', 'web-search', 'fact-checking', 'summarization', 'web-access'],
    idealFor: [
      'Market research and competitive analysis',
      'Academic research and literature reviews',
      'Fact-checking and source verification',
      'News monitoring and trend analysis',
      'Content aggregation and curation',
    ],
    systemPrompt,
    requiredDependencies: [
      '@anthropic-ai/claude-agent-sdk',
      'zod',
      'axios', // For HTTP requests
      'cheerio', // For HTML parsing
    ],
    recommendedIntegrations: [
      'Search APIs (Google Custom Search, Bing)',
      'Web scraping tools (Puppeteer, Playwright)',
      'Knowledge bases (Wikipedia API)',
      'Citation management (Zotero)',
    ],
  },
  [webSearchTool, scrapeContentTool, extractFactsTool, verifySourcesTool]
);
