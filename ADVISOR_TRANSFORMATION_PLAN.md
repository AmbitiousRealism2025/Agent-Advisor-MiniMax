# Agent Advisor Transformation Plan: Code Generator to Documentation System

## Executive Summary

This plan outlines the complete transformation of the Agent Advisor from a code generation system to a pure documentation generation system. The advisor will create comprehensive planning documents for handoff to coding agents, with no code generation capabilities.

**Critical Change**: The advisor will ONLY generate documentation, NOT code.

## Project Context

- **Repository**: `/Users/ambrealismwork/Desktop/Coding-Projects/agent_advisor-minimax-mvp`
- **Current State**: Full code generation system with 4 generation tools
- **Target State**: Documentation-only system with 1 planning document tool
- **Orchestrator**: Tracer (workflow automation)
- **Coding Agent**: Claude
- **Verification**: Automated testing loop after each phase

## Phase 1: Core Architecture Transformation

### 1.1 Remove Code Generation Tools

**Files to Modify**:
- `src/advisor-agent.ts`
- `src/lib/generation/tool-handlers.ts`

**Specific Changes**:

```typescript
// REMOVE from src/advisor-agent.ts (lines 48-55)
- createGenerateAgentCodeTool(),
- createGenerateSystemPromptTool(),
- createGenerateConfigFilesTool(),

// KEEP only:
+ createInterviewTool(),
+ createClassifyAgentTypeTool(),
+ createGeneratePlanningDocumentTool(), // NEW - to be created
```

**Delete These Files Completely**:
```bash
rm src/lib/generation/code-generator.ts
rm src/lib/generation/prompt-generator.ts
rm src/lib/generation/config-generator.ts
rm src/lib/generation/tool-handlers.ts
```

### 1.2 Create New Planning Document Tool

**Create New File**: `src/lib/documentation/planning-document-tool.ts`

```typescript
// Structure for new planning document tool
export function createGeneratePlanningDocumentTool() {
  return {
    name: 'generate_planning_document',
    description: 'Generate comprehensive planning document for agent implementation',
    input_schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
        requirements: { type: 'object' },
        includeArchitecture: { type: 'boolean', default: true },
        includePhases: { type: 'boolean', default: true },
        includeRiskAnalysis: { type: 'boolean', default: true },
        verbosityLevel: {
          type: 'string',
          enum: ['concise', 'standard', 'detailed'],
          default: 'detailed'
        }
      },
      required: ['templateId', 'requirements']
    }
  };
}
```

### 1.3 Create Document Generator Module

**Create New File**: `src/lib/documentation/document-generator.ts`

```typescript
export class PlanningDocumentGenerator {
  // Document sections to generate
  private sections = [
    'agent-overview',
    'technical-requirements',
    'implementation-architecture',
    'key-implementation-phases',
    'security-compliance',
    'success-metrics',
    'risk-mitigation',
    'deployment-considerations'
  ];

  generateDocument(params: DocumentParams): string {
    // Generate comprehensive planning document
    // Return as formatted Markdown string
  }

  private generateOverviewSection() {}
  private generateRequirementsSection() {}
  private generateArchitectureSection() {}
  private generatePhasesSection() {}
  private generateSecuritySection() {}
  private generateMetricsSection() {}
  private generateRiskSection() {}
  private generateDeploymentSection() {}
}
```

### 1.4 Update System Prompt

**File**: `src/advisor-agent.ts` (lines 80-100)

**Replace Current Prompt With**:
```typescript
const ADVISOR_SYSTEM_PROMPT = `You are an expert AI Planning Document Generator specializing in creating comprehensive implementation plans for AI agents.

## Your Role

You create detailed planning documents that coding agents can use to implement AI systems. You DO NOT generate code - you ONLY generate planning documentation.

Your workflow:

1. **Interview Phase**: Conduct comprehensive requirements gathering using the ask_interview_question tool
2. **Classification Phase**: Determine the appropriate agent type using the classify_agent_type tool
3. **Documentation Phase**: Generate a complete planning document using the generate_planning_document tool

## Output Format

All output is a single comprehensive Markdown planning document containing:
- Agent overview and classification
- Technical requirements summary
- Implementation architecture
- Phased implementation plan
- Security and compliance considerations
- Success metrics and validation
- Risk mitigation strategies
- Deployment considerations

## Important Constraints

- You NEVER generate code
- You NEVER create configuration files
- You ONLY produce planning documents
- All output is formatted Markdown for handoff to coding agents
`;
```

### Verification Checkpoint 1
```bash
# Run after Phase 1 completion
npm test tests/unit/documentation/  # New test directory
npm run build  # Should compile without errors
grep -r "generate_agent_code" src/  # Should return no results
grep -r "generate_planning_document" src/  # Should find new tool
```

## Phase 2: Transform Template System

### 2.1 Convert Templates to Document Templates

**Files to Modify**:
- `src/templates/data-analyst.ts`
- `src/templates/content-creator.ts`
- `src/templates/code-assistant.ts`
- `src/templates/research-agent.ts`
- `src/templates/automation-agent.ts`
- `src/templates/template-types.ts`

**New Template Structure**:
```typescript
// src/templates/template-types.ts
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;

  // Document structure (not code structure)
  documentSections: {
    overview: DocumentSection;
    requirements: DocumentSection;
    architecture: DocumentSection;
    implementation: DocumentSection;
    testing: DocumentSection;
    deployment: DocumentSection;
  };

  // Planning elements (not code elements)
  planningChecklist: string[];
  architecturePatterns: string[];
  riskConsiderations: string[];
  successCriteria: string[];

  // Remove all of these:
  // - defaultTools (no tool definitions)
  // - systemPromptTemplate (no prompts)
  // - configurationSchema (no configs)
  // - packageDependencies (no packages)
}
```

### 2.2 Create Document Section Templates

**Create New File**: `src/templates/sections/index.ts`

```typescript
export const SECTION_TEMPLATES = {
  overview: {
    title: 'Agent Overview',
    subsections: [
      'Classification',
      'Primary Function',
      'Target Users',
      'Interface',
      'Core Purpose'
    ]
  },
  requirements: {
    title: 'Technical Requirements',
    subsections: [
      'Core Capabilities',
      'Key Features',
      'Performance Requirements',
      'Constraints'
    ]
  },
  architecture: {
    title: 'Implementation Architecture',
    subsections: [
      'System Components',
      'Data Flow',
      'Integration Points',
      'Technology Stack'
    ]
  }
  // ... more sections
};
```

### Verification Checkpoint 2
```bash
# Run after Phase 2 completion
npm test tests/unit/templates/  # Updated template tests
grep -r "defaultTools" src/templates/  # Should return no results
grep -r "documentSections" src/templates/  # Should find new structure
```

## Phase 3: Enhanced Save Functionality

### 3.1 Implement Interactive Directory Selection

**File to Modify**: `src/cli.ts`

**Add New Methods**:
```typescript
class AdvisorCLI {
  // Add these new methods

  private async selectDirectory(): Promise<string> {
    const currentDir = process.cwd();
    const dirs = await this.listDirectories(currentDir);

    console.log(`\nCurrent directory: ${currentDir}`);
    console.log('Available directories:');

    dirs.forEach((dir, index) => {
      console.log(`  ${index + 1}. ${dir}/`);
    });

    console.log(`  ${dirs.length + 1}. [Create new directory]`);
    console.log(`  ${dirs.length + 2}. [Use current directory]`);
    console.log(`  ${dirs.length + 3}. [Enter custom path]`);

    const choice = await this.prompt('Select directory (number): ');
    return this.processDirectoryChoice(choice, dirs);
  }

  private async listDirectories(path: string): Promise<string[]> {
    const entries = await fs.readdir(path, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .filter(entry => !entry.name.startsWith('.'))
      .map(entry => entry.name)
      .sort();
  }

  private async createNewDirectory(): Promise<string> {
    const name = await this.prompt('Enter new directory name: ');
    const sanitized = this.sanitizeDirectoryName(name);
    const fullPath = path.join(process.cwd(), sanitized);

    if (fs.existsSync(fullPath)) {
      console.log(`Directory ${sanitized} already exists.`);
      return fullPath;
    }

    await fs.mkdir(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${fullPath}`);
    return fullPath;
  }

  private async saveWithDirectorySelection(content: string) {
    try {
      // Step 1: Select directory
      const selectedDir = await this.selectDirectory();

      // Step 2: Get filename
      const defaultName = `agent-plan-${Date.now()}.md`;
      const filename = await this.prompt(`Enter filename (default: ${defaultName}): `) || defaultName;

      // Step 3: Construct full path
      const fullPath = path.join(selectedDir, filename);

      // Step 4: Check if file exists
      if (fs.existsSync(fullPath)) {
        const overwrite = await this.prompt(`File exists. Overwrite? (y/n): `);
        if (overwrite.toLowerCase() !== 'y') {
          console.log('Save cancelled.');
          return;
        }
      }

      // Step 5: Save file
      await fs.writeFile(fullPath, content);

      // Step 6: Success feedback
      const stats = await fs.stat(fullPath);
      console.log('\n✅ Document saved successfully');
      console.log(`📄 File: ${fullPath}`);
      console.log(`📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);

      // Remember directory for session
      this.lastSaveDirectory = selectedDir;

    } catch (error) {
      console.error('Error saving file:', error.message);
    }
  }
}
```

### 3.2 Update Save Command Handler

**Modify in**: `src/cli.ts` (handleCommand method)

```typescript
case 'save':
  if (!this.lastAdvisorOutput) {
    console.log('No output to save. Run a query first.');
    return;
  }

  // Use new interactive save
  await this.saveWithDirectorySelection(this.lastAdvisorOutput);
  break;
```

### Verification Checkpoint 3
```bash
# Test save functionality
npm run cli
# Type: /save
# Should see directory listing and interactive prompts
```

## Phase 4: Update Test Suite

### 4.1 Remove Code Generation Tests

**Delete These Test Files**:
```bash
rm tests/unit/generation/code-generator.test.ts
rm tests/unit/generation/prompt-generator.test.ts
rm tests/unit/generation/config-generator.test.ts
rm tests/e2e/code-compilation-validation.test.ts
```

### 4.2 Create Documentation Tests

**Create New Test Files**:
- `tests/unit/documentation/document-generator.test.ts`
- `tests/unit/documentation/planning-tool.test.ts`
- `tests/e2e/document-generation.test.ts`

**Example Test Structure**:
```typescript
// tests/unit/documentation/document-generator.test.ts
describe('PlanningDocumentGenerator', () => {
  it('should generate complete planning document', () => {
    const generator = new PlanningDocumentGenerator();
    const doc = generator.generateDocument({
      templateId: 'research-agent',
      requirements: mockRequirements
    });

    expect(doc).toContain('# Agent Overview');
    expect(doc).toContain('## Technical Requirements');
    expect(doc).toContain('## Implementation Architecture');
    // ... verify all sections present
  });

  it('should not contain any code blocks', () => {
    const doc = generator.generateDocument(params);
    expect(doc).not.toContain('```typescript');
    expect(doc).not.toContain('```javascript');
    expect(doc).not.toContain('function ');
    expect(doc).not.toContain('class ');
  });
});
```

### Verification Checkpoint 4
```bash
# Run complete test suite
npm test
# All tests should pass
# No code generation tests should exist
```

## Phase 5: Clean Up and Documentation

### 5.1 Update Package.json

```json
{
  "name": "agent-advisor-documentation",
  "description": "AI-powered advisor that creates planning documents for agent implementation",
  "scripts": {
    // Remove any code-generation related scripts
  }
}
```

### 5.2 Update README.md

Update to reflect new purpose:
- Change all references from "code generation" to "documentation generation"
- Update examples to show planning documents, not code
- Update workflow descriptions

### 5.3 Update CLAUDE.md

Critical updates needed:
- Remove all code generation references
- Update tool descriptions
- Update workflow description
- Add new document-focused guidelines

## Verification & Validation Plan

### Automated Verification Loop

After each phase, Tracer should execute:

```bash
#!/bin/bash
# verification.sh

echo "Running verification for Phase $1"

# 1. Build check
npm run build || exit 1

# 2. Type check
npx tsc --noEmit || exit 1

# 3. Test execution
npm test || exit 1

# 4. Specific phase checks
case $1 in
  1)
    # Verify no code generation tools remain
    if grep -r "generate_agent_code\|generate_system_prompt\|generate_config_files" src/; then
      echo "ERROR: Code generation tools still present"
      exit 1
    fi
    ;;
  2)
    # Verify templates transformed
    if grep -r "defaultTools\|systemPromptTemplate" src/templates/; then
      echo "ERROR: Code template elements still present"
      exit 1
    fi
    ;;
  3)
    # Test save functionality
    echo "Testing save functionality..."
    # Create test script that exercises save function
    ;;
  4)
    # Verify test suite updated
    if ls tests/unit/generation/*.test.ts 2>/dev/null; then
      echo "ERROR: Old generation tests still present"
      exit 1
    fi
    ;;
esac

echo "Phase $1 verification complete"
```

### Manual Validation Steps

After full implementation:

1. **End-to-End Test**:
   ```bash
   npm run cli
   # Complete full interview
   # Verify document generation
   # Test save functionality
   ```

2. **Document Quality Check**:
   - Generate documents for all 5 agent types
   - Verify completeness and formatting
   - Ensure no code artifacts remain

3. **Handoff Test**:
   - Take generated document
   - Give to separate Claude instance
   - Verify Claude can implement from documentation

## Rollback Procedures

If any phase fails:

### Phase 1 Rollback
```bash
git checkout -- src/advisor-agent.ts
git checkout -- src/lib/generation/
# Restore original tool structure
```

### Phase 2 Rollback
```bash
git checkout -- src/templates/
# Restore original templates
```

### Phase 3 Rollback
```bash
git checkout -- src/cli.ts
# Restore original CLI
```

### Phase 4 Rollback
```bash
git checkout -- tests/
# Restore original tests
```

## Success Criteria

The transformation is complete when:

1. ✅ No code generation capabilities exist
2. ✅ Single planning document tool works correctly
3. ✅ All templates generate documentation only
4. ✅ Interactive save function works
5. ✅ All tests pass
6. ✅ Full workflow produces planning documents
7. ✅ Documents are suitable for handoff to coding agents

## Timeline Estimate

- **Phase 1**: 2-3 hours (Core architecture)
- **Phase 2**: 2 hours (Template transformation)
- **Phase 3**: 1-2 hours (Save functionality)
- **Phase 4**: 1 hour (Test updates)
- **Phase 5**: 30 minutes (Documentation)

**Total**: 6-8 hours of development time

## Risk Analysis

### High Risk Items
1. **Tool Registration Changes**: May break existing workflow
   - Mitigation: Careful testing after each tool change

2. **Template System Overhaul**: Complex refactoring
   - Mitigation: Transform one template at a time

3. **Save Function Permissions**: OS-level file access
   - Mitigation: Proper error handling and fallbacks

### Medium Risk Items
1. **Test Suite Updates**: May miss edge cases
   - Mitigation: Comprehensive test coverage

2. **Session State**: May break with new structure
   - Mitigation: Backward compatibility checks

## Implementation Order for Tracer

1. Create backup branch: `git checkout -b advisor-documentation-transformation`
2. Execute Phase 1 with Claude
3. Run Verification Checkpoint 1
4. Execute Phase 2 with Claude
5. Run Verification Checkpoint 2
6. Execute Phase 3 with Claude
7. Run Verification Checkpoint 3
8. Execute Phase 4 with Claude
9. Run Verification Checkpoint 4
10. Execute Phase 5 with Claude
11. Run complete validation suite
12. Merge to main branch if all checks pass

## Notes for Tracer Orchestration

- Each phase should be atomic and verifiable
- Use Claude in focused sessions for each phase
- Maintain verification logs for audit trail
- If any phase fails, stop and alert for manual intervention
- Keep original code in separate branch for reference
- Document any deviations from plan

---

**This plan is ready for Tracer orchestration with Claude as the coding agent. Each phase is clearly defined with specific files, line numbers, and verification steps.**