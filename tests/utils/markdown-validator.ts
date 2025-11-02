import { validateTypeScriptCode, validateJSON } from './test-helpers.js';

export interface CodeBlock {
  language: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface MarkdownDocument {
  codeBlocks: CodeBlock[];
  fileHeaders: string[];
  copyInstructions: string[];
  metadata: Record<string, string>;
  nextSteps: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface FileHeaderMeta {
  filename: string;
  line: number;
}

function normalizeLanguage(raw: string): string {
  const token = raw.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  if (!token) {
    return '';
  }

  const aliasMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml'
  };

  return aliasMap[token] || token;
}

function extractFileHeaders(markdown: string): FileHeaderMeta[] {
  const headers: FileHeaderMeta[] = [];
  const lines = markdown.split('\n');
  const headerPattern = /^###\s+File:\s*`([^`]+)`/;

  lines.forEach((line, index) => {
    const match = headerPattern.exec(line.trim());
    if (match) {
      headers.push({ filename: match[1].trim(), line: index + 1 });
    }
  });

  return headers;
}

export function parseMarkdownDocument(markdown: string): MarkdownDocument {
  const lines = markdown.split('\n');
  const codeBlocks: CodeBlock[] = [];
  const fileHeaders: string[] = [];
  const copyInstructions: string[] = [];
  const metadata: Record<string, string> = {};
  const nextSteps: string[] = [];

  const headerPattern = /^###\s+File:\s*`([^`]+)`/;
  const copyInstructionPattern = /^\*\*To use\*\*:/i;
  const metadataPattern = /^\s*-\s*\*\*(.+?)\*\*:\s*(.+)$/;

  const codeBlockPattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(markdown)) !== null) {
    const rawLanguage = match[1] || '';
    const language = normalizeLanguage(rawLanguage);
    const content = match[2] || '';

    const preText = markdown.slice(0, match.index);
    const openingLineNumber = preText.split('\n').length;
    const contentLineStart = openingLineNumber + 1;
    const contentForLineCalc = content.endsWith('\n') ? content.slice(0, -1) : content;
    const contentLines = contentForLineCalc.length > 0 ? contentForLineCalc.split('\n') : [];
    const contentLineCount = contentLines.length;
    const hasContent = contentLineCount > 0;
    const startLine = contentLineStart;
    const endLine = hasContent ? contentLineStart + contentLineCount - 1 : contentLineStart;

    codeBlocks.push({
      language,
      content,
      startLine,
      endLine
    });
  }

  const fenceRanges = codeBlocks.map(block => {
    const normalizedContent = block.content.endsWith('\n') ? block.content.slice(0, -1) : block.content;
    const contentLines = normalizedContent.length > 0 ? normalizedContent.split('\n').length : 0;
    const openingFenceLine = Math.max(block.startLine - 1, 1);
    const closingFenceLine = block.startLine - 1 + contentLines + 1;
    return { start: openingFenceLine, end: closingFenceLine };
  });

  const isInsideCodeBlock = (lineNumber: number): boolean => {
    return fenceRanges.some(range => lineNumber >= range.start && lineNumber <= range.end);
  };

  let inNextStepsSection = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lineNumber = index + 1;

    if (isInsideCodeBlock(lineNumber)) {
      return;
    }

    const headerMatch = headerPattern.exec(trimmed);
    if (headerMatch) {
      fileHeaders.push(headerMatch[1].trim());
      inNextStepsSection = false;
      return;
    }

    if (/^##\s+Next Steps/i.test(trimmed)) {
      inNextStepsSection = true;
      return;
    }

    if (/^##\s+/.test(trimmed) && !/^##\s+Next Steps/i.test(trimmed)) {
      inNextStepsSection = false;
    }

    if (copyInstructionPattern.test(trimmed)) {
      copyInstructions.push(trimmed);
    }

    const metadataMatch = metadataPattern.exec(line);
    if (metadataMatch) {
      metadata[metadataMatch[1].trim()] = metadataMatch[2].trim();
    }

    if (inNextStepsSection && /^[-*]\s+/.test(trimmed)) {
      nextSteps.push(trimmed.replace(/^[-*]\s+/, '').trim());
    }
  });

  // Handle unterminated code block
  return {
    codeBlocks,
    fileHeaders,
    copyInstructions,
    metadata,
    nextSteps
  };
}

export function validateMarkdownStructure(markdown: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const document = parseMarkdownDocument(markdown);
  const lines = markdown.split('\n');

  const sectionMatches = markdown.match(/^##\s+.+$/gm) || [];
  if (sectionMatches.length === 0) {
    errors.push('Markdown is missing required section headers (## heading).');
  }

  document.codeBlocks.forEach((block, index) => {
    if (!block.language) {
      errors.push(`Code block ${index + 1} is missing a language tag.`);
    }

    // Ensure each code block has a preceding file header
    let hasHeader = false;
    for (let i = block.startLine - 2; i >= 0; i--) {
      if (/^###\s+File:\s*`/.test(lines[i].trim())) {
        hasHeader = true;
        break;
      }
      if (/^##\s+/.test(lines[i].trim())) {
        break;
      }
    }
    if (!hasHeader) {
      errors.push(`Code block ${index + 1} does not have a preceding file header.`);
    }

    // Ensure copy instructions follow the code block before next header or code fence
    let copyInstructionFound = false;
    for (let i = block.endLine; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^###\s+File:\s*`/.test(line) || /^```/.test(line) || /^##\s+/.test(line)) {
        break;
      }
      if (/^\*\*To use\*\*:/i.test(line)) {
        copyInstructionFound = true;
        break;
      }
    }
    if (!copyInstructionFound) {
      errors.push(`Copy instructions missing after code block ${index + 1}.`);
    }
  });

  if (document.copyInstructions.length === 0) {
    warnings.push('No copy instructions found in Markdown document.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function extractCodeFromMarkdown(markdown: string, language?: string): string[] {
  const document = parseMarkdownDocument(markdown);

  if (!language) {
    return document.codeBlocks.map((block) => block.content);
  }

  const normalized = language.toLowerCase();
  return document.codeBlocks
    .filter((block) => block.language.toLowerCase() === normalized)
    .map((block) => block.content);
}

export function extractFileMapping(markdown: string): Map<string, string> {
  const mapping = new Map<string, string>();
  const headers = extractFileHeaders(markdown);
  const document = parseMarkdownDocument(markdown);

  headers.forEach((header, index) => {
    const nextHeaderLine = index < headers.length - 1 ? headers[index + 1].line : Number.POSITIVE_INFINITY;
    const matchingBlock = document.codeBlocks.find((block) => {
      return block.startLine > header.line && block.startLine < nextHeaderLine;
    });

    if (matchingBlock) {
      mapping.set(header.filename, matchingBlock.content);
    }
  });

  return mapping;
}

export function validateCodeBlock(codeBlock: CodeBlock): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!codeBlock.language) {
    errors.push('Code block is missing a language tag.');
  }

  if (!codeBlock.content.trim()) {
    errors.push('Code block content is empty.');
  }

  const language = codeBlock.language.toLowerCase();

  if (language === 'json' || language === 'jsonc') {
    const result = validateJSON(codeBlock.content);
    if (!result.valid) {
      errors.push(result.error || 'Invalid JSON content.');
    }
  }

  if (language === 'typescript' || language === 'ts' || language === 'typescriptreact') {
    const result = validateTypeScriptCode(codeBlock.content);
    if (!result.valid) {
      errors.push(...result.errors);
    }
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
