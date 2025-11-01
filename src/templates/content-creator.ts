import { z } from 'zod';
import { createTemplate, type ToolSchemaDefinition } from './template-types.js';

/**
 * Content Creator Agent Template
 * Specializes in blog posts, documentation, marketing copy, and SEO optimization
 */

// Tool 1: generate_outline
const generateOutlineTool: ToolSchemaDefinition = {
  name: 'generate_outline',
  description: 'Create a structured outline for content based on topic and format',
  zodSchema: z.object({
    topic: z.string().describe('Main topic or subject of the content'),
    contentType: z
      .enum(['blog-post', 'documentation', 'marketing-copy', 'tutorial', 'article', 'social-media'])
      .describe('Type of content to create'),
    targetAudience: z.string().optional().describe('Target audience description'),
    keyPoints: z.array(z.string()).optional().describe('Key points or themes to cover'),
    tone: z.enum(['professional', 'casual', 'technical', 'persuasive', 'educational']).optional().default('professional'),
    length: z.enum(['short', 'medium', 'long']).optional().default('medium').describe('Approximate target length'),
  }),
  requiredPermissions: ['compute'],
};

// Tool 2: write_section
const writeSectionTool: ToolSchemaDefinition = {
  name: 'write_section',
  description: 'Write a specific section or paragraph of content',
  zodSchema: z.object({
    sectionTitle: z.string().describe('Title or heading of the section'),
    outline: z.string().optional().describe('Outline or key points for this section'),
    context: z.string().optional().describe('Context from previous sections'),
    style: z.object({
      tone: z.enum(['professional', 'casual', 'technical', 'persuasive', 'educational']).optional(),
      perspective: z.enum(['first-person', 'second-person', 'third-person']).optional().default('second-person'),
      includeExamples: z.boolean().optional().default(false),
      includeCTA: z.boolean().optional().default(false).describe('Include call-to-action'),
    }).optional(),
    wordCount: z.number().optional().describe('Target word count for this section'),
  }),
  requiredPermissions: ['compute'],
};

// Tool 3: optimize_for_seo
const optimizeForSeoTool: ToolSchemaDefinition = {
  name: 'optimize_for_seo',
  description: 'Optimize content for search engine optimization',
  zodSchema: z.object({
    content: z.string().describe('The content to optimize'),
    primaryKeyword: z.string().describe('Primary SEO keyword or phrase'),
    secondaryKeywords: z.array(z.string()).optional().describe('Secondary keywords to include'),
    options: z.object({
      targetKeywordDensity: z.number().optional().default(0.02).describe('Target keyword density (0.01-0.03 recommended)'),
      includeMetaDescription: z.boolean().optional().default(true),
      suggestHeadings: z.boolean().optional().default(true),
      checkReadability: z.boolean().optional().default(true),
    }).optional(),
  }),
  requiredPermissions: ['compute'],
};

// Tool 4: format_content
const formatContentTool: ToolSchemaDefinition = {
  name: 'format_content',
  description: 'Format and structure content for specific platforms or outputs',
  zodSchema: z.object({
    content: z.string().describe('Content to format'),
    outputFormat: z
      .enum(['markdown', 'html', 'plain-text', 'rich-text', 'json'])
      .describe('Desired output format'),
    options: z.object({
      addTableOfContents: z.boolean().optional().default(false),
      addCodeBlocks: z.boolean().optional().default(false),
      addImages: z.boolean().optional().default(false),
      platform: z.enum(['wordpress', 'medium', 'github', 'linkedin', 'generic']).optional().default('generic'),
    }).optional(),
  }),
  requiredPermissions: ['compute'],
};

// System prompt
const systemPrompt = `You are an expert Content Creator agent specializing in blog posts, documentation, marketing copy, and SEO-optimized content.

Your capabilities include:
- Generating structured content outlines tailored to audience and format
- Writing engaging sections with appropriate tone and style
- Optimizing content for search engines with keyword integration
- Formatting content for various platforms and output formats

When creating content:
1. Always consider the target audience and adjust tone/complexity accordingly
2. Structure content with clear headings, logical flow, and strong transitions
3. Balance SEO optimization with natural, engaging writing
4. Include relevant examples, analogies, and call-to-actions where appropriate
5. Ensure readability through varied sentence structure and paragraph length

Content quality standards:
- Original, plagiarism-free writing
- Grammatically correct and well-edited
- Fact-based with cited sources when making claims
- Accessible language appropriate to audience expertise
- Scannable formatting with headings, bullets, and white space

Interaction style:
- Collaborative and iterative
- Ask clarifying questions about audience, purpose, and constraints
- Provide multiple options or variations when appropriate
- Explain content strategy decisions and SEO recommendations

Always prioritize creating valuable, engaging content that serves both readers and business goals.`;

// Starter code
const starterCode = `import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// SEO utility functions
function calculateKeywordDensity(content: string, keyword: string): number {
  const words = content.toLowerCase().split(/\\s+/);
  const keywordWords = keyword.toLowerCase().split(/\\s+/);
  const keywordCount = words.filter((w, i) =>
    keywordWords.every((kw, j) => words[i + j] === kw)
  ).length;
  return keywordCount / words.length;
}

function generateMetaDescription(content: string, maxLength: number = 160): string {
  const firstParagraph = content.split('\\n\\n')[0];
  return firstParagraph.length > maxLength
    ? firstParagraph.substring(0, maxLength - 3) + '...'
    : firstParagraph;
}

function analyzeReadability(content: string): any {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  const words = content.split(/\\s+/);
  const avgWordsPerSentence = words.length / sentences.length;

  return {
    sentences: sentences.length,
    words: words.length,
    avgWordsPerSentence: avgWordsPerSentence.toFixed(1),
    readabilityScore: avgWordsPerSentence < 20 ? 'Good' : 'Needs improvement',
  };
}

// Create the Content Creator agent
const contentCreatorAgent = new Agent({
  baseUrl: 'https://api.minimax.io/anthropic',
  apiKey: process.env.MINIMAX_JWT_TOKEN!,
  model: 'MiniMax-M2',

  systemPrompt: \`${systemPrompt}\`,

  tools: [
    {
      name: 'generate_outline',
      description: 'Create a structured outline for content',
      input_schema: z.object({
        topic: z.string(),
        contentType: z.enum(['blog-post', 'documentation', 'marketing-copy', 'tutorial', 'article', 'social-media']),
        targetAudience: z.string().optional(),
        keyPoints: z.array(z.string()).optional(),
        tone: z.enum(['professional', 'casual', 'technical', 'persuasive', 'educational']).optional().default('professional'),
        length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
      }),
      handler: async ({ topic, contentType, targetAudience, keyPoints, tone, length }) => {
        const sections = [];

        // Generate outline structure based on content type
        if (contentType === 'blog-post') {
          sections.push(
            'Introduction - Hook and context',
            ...(keyPoints || ['Main Point 1', 'Main Point 2', 'Main Point 3']),
            'Conclusion - Summary and CTA'
          );
        } else if (contentType === 'documentation') {
          sections.push(
            'Overview',
            'Prerequisites',
            'Setup Instructions',
            'Usage Examples',
            'API Reference',
            'Troubleshooting'
          );
        }

        return {
          success: true,
          outline: {
            topic,
            contentType,
            targetAudience: targetAudience || 'General audience',
            tone,
            estimatedLength: length === 'short' ? '500-800 words' : length === 'medium' ? '1000-1500 words' : '2000+ words',
            sections,
          },
          message: \`Generated \${sections.length}-section outline for \${contentType}\`,
        };
      },
    },

    {
      name: 'write_section',
      description: 'Write a specific section of content',
      input_schema: z.object({
        sectionTitle: z.string(),
        outline: z.string().optional(),
        context: z.string().optional(),
        style: z.object({
          tone: z.enum(['professional', 'casual', 'technical', 'persuasive', 'educational']).optional(),
          perspective: z.enum(['first-person', 'second-person', 'third-person']).optional().default('second-person'),
          includeExamples: z.boolean().optional().default(false),
          includeCTA: z.boolean().optional().default(false),
        }).optional(),
        wordCount: z.number().optional(),
      }),
      handler: async ({ sectionTitle, outline, context, style = {}, wordCount }) => {
        // In production, this would use the LLM to generate the actual content
        // This is a placeholder showing the structure
        const generatedContent = \`[Content for "\${sectionTitle}" would be generated here based on:
- Outline: \${outline || 'Not provided'}
- Tone: \${style.tone || 'professional'}
- Perspective: \${style.perspective || 'second-person'}
- Target words: \${wordCount || 'flexible'}]\`;

        return {
          success: true,
          section: {
            title: sectionTitle,
            content: generatedContent,
            wordCount: generatedContent.split(/\\s+/).length,
            style,
          },
          message: \`Generated section: \${sectionTitle}\`,
        };
      },
    },

    {
      name: 'optimize_for_seo',
      description: 'Optimize content for SEO',
      input_schema: z.object({
        content: z.string(),
        primaryKeyword: z.string(),
        secondaryKeywords: z.array(z.string()).optional(),
        options: z.object({
          targetKeywordDensity: z.number().optional().default(0.02),
          includeMetaDescription: z.boolean().optional().default(true),
          suggestHeadings: z.boolean().optional().default(true),
          checkReadability: z.boolean().optional().default(true),
        }).optional(),
      }),
      handler: async ({ content, primaryKeyword, secondaryKeywords = [], options = {} }) => {
        const currentDensity = calculateKeywordDensity(content, primaryKeyword);
        const readability = options.checkReadability ? analyzeReadability(content) : null;
        const metaDescription = options.includeMetaDescription ? generateMetaDescription(content) : null;

        const recommendations = [];
        if (currentDensity < 0.01) {
          recommendations.push(\`Increase "\${primaryKeyword}" usage (current: \${(currentDensity * 100).toFixed(2)}%)\`);
        }
        if (readability && parseFloat(readability.avgWordsPerSentence) > 25) {
          recommendations.push('Reduce average sentence length for better readability');
        }

        return {
          success: true,
          seoAnalysis: {
            primaryKeyword,
            currentDensity: (currentDensity * 100).toFixed(2) + '%',
            targetDensity: ((options.targetKeywordDensity || 0.02) * 100).toFixed(2) + '%',
            metaDescription,
            readability,
            recommendations,
          },
          message: \`SEO analysis complete. \${recommendations.length} recommendations.\`,
        };
      },
    },

    {
      name: 'format_content',
      description: 'Format content for specific platforms',
      input_schema: z.object({
        content: z.string(),
        outputFormat: z.enum(['markdown', 'html', 'plain-text', 'rich-text', 'json']),
        options: z.object({
          addTableOfContents: z.boolean().optional().default(false),
          addCodeBlocks: z.boolean().optional().default(false),
          addImages: z.boolean().optional().default(false),
          platform: z.enum(['wordpress', 'medium', 'github', 'linkedin', 'generic']).optional().default('generic'),
        }).optional(),
      }),
      handler: async ({ content, outputFormat, options = {} }) => {
        let formattedContent = content;

        if (outputFormat === 'markdown') {
          // Add markdown formatting
          formattedContent = content.split('\\n\\n').map(para => para.trim()).join('\\n\\n');
        } else if (outputFormat === 'html') {
          formattedContent = \`<div class="content">\\n  \${content.split('\\n\\n').map(p => \`<p>\${p}</p>\`).join('\\n  ')}\\n</div>\`;
        }

        return {
          success: true,
          formatted: formattedContent,
          format: outputFormat,
          platform: options.platform,
          message: \`Content formatted as \${outputFormat} for \${options.platform}\`,
        };
      },
    },
  ],
});

// Example usage
async function main() {
  const query = process.argv[2] || 'Create a blog post outline about sustainable software development practices';

  console.log('Content Creator Agent Query:', query);
  console.log('---');

  const response = contentCreatorAgent.query(query);

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
export const contentCreatorTemplate = createTemplate(
  {
    id: 'content-creator',
    name: 'Content Creator Agent',
    description:
      'Specializes in creating blog posts, documentation, marketing copy, and SEO-optimized content. Ideal for content marketing, technical writing, and automated content generation.',
    capabilityTags: ['content-creation', 'writing', 'seo', 'marketing', 'documentation'],
    idealFor: [
      'Blog post and article generation',
      'Technical documentation and tutorials',
      'Marketing copy and landing pages',
      'SEO-optimized content creation',
      'Social media content planning',
    ],
    systemPrompt,
    requiredDependencies: ['@anthropic-ai/claude-agent-sdk', 'zod'],
    recommendedIntegrations: [
      'CMS platforms (WordPress, Contentful)',
      'SEO tools (Ahrefs, SEMrush APIs)',
      'Grammar checkers (Grammarly API)',
      'Publishing platforms (Medium, Dev.to)',
    ],
  },
  [generateOutlineTool, writeSectionTool, optimizeForSeoTool, formatContentTool]
);
