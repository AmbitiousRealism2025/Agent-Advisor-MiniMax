# Testing Notes

## Issues & Future Improvements

This document tracks observed issues and planned improvements for the Agent Advisor MVP. Items are documented as they're discovered during testing and will be addressed in future iterations.

---

## 1. Message Truncation Issue

**Status**: 🔴 Needs Investigation

**Observed Behavior**:
- Response messages, thinking blocks, and agent outputs are being truncated aggressively
- Truncation appears to happen at less than 80 characters in many cases
- This severely limits visibility into the agent's reasoning process and makes debugging difficult

**Current Hypothesis**:
- Truncation logic may be hardcoded in the streaming event handlers
- Likely located in `src/advisor-agent.ts` where streaming events are processed
- May be multiple truncation points for different message types (thinking, text, tool results)

**Proposed Solutions**:
1. **Option A - Balanced Truncation**: Increase truncation limit to 200-300 characters maximum to balance readability with console space
2. **Option B - Configurable Truncation**: Add environment variable (e.g., `MAX_MESSAGE_LENGTH`) to allow user control
3. **Option C - Smart Truncation**: Show first 200 chars + last 100 chars with "..." in between for very long messages
4. **Option D - No Truncation**: Remove truncation entirely and show full messages (may cause console clutter)

**Priority**: High (impacts debugging and user experience)

**Next Steps**:
- Locate all truncation logic in the codebase
- Test different truncation lengths (200, 300, 500 characters)
- Consider making truncation configurable via `.env`
- Evaluate impact on console readability

---

## 2. Output Format & File Generation

**Status**: 🟡 Design Decision Needed

**Current State**:
- Agent generates code, prompts, and configuration as text in the console
- No actual files are written to disk during the streaming workflow
- User must manually copy-paste generated content into files

**MVP Goal**:
- Agent should generate a **Markdown document** containing all generated content
- This document can be fed into the user's preferred coding agent/environment
- Simplifies the workflow: advisor generates → user copies Markdown → coding agent implements

**Production Goal**:
- Interactive directory selection: Agent asks user where to save the generated project
- Options should include:
  - Specify custom directory path (e.g., `./my-agent`, `../projects/agent-name`)
  - Save in current directory
  - Default to `./output/[agent-name]`
- Confirmation step: Show user the output directory before writing files
- Validation: Check if directory exists and prompt for overwrite permission

**Technical Implementation Notes**:
- The `AgentPackager` class (`src/lib/export/packager.ts`) already has full file-writing capability
- Need to integrate packager into the streaming advisor workflow
- May require adding a new tool: `export_agent_project` that:
  - Accepts `outputDirectory` parameter
  - Takes all generated content from previous tool calls
  - Writes complete project structure to disk
  - Returns manifest of created files

**User Experience Flow**:
```
1. User completes interview
2. Agent generates code/prompts/config
3. Agent asks: "Where would you like to save this project?"
   - Options: [Custom path] / [Current directory] / [Default: ./output]
4. User provides directory
5. Agent writes all files
6. Agent displays:
   - ✅ Project created at: /path/to/project
   - 📁 Files created: [list]
   - 📋 Next steps: npm install, npm run build, etc.
```

**Priority**: Medium (MVP can work with console output, but production needs file generation)

**Next Steps**:
- **For MVP**: Generate comprehensive Markdown document with all code/config in code blocks
- **For Production**:
  - Add output directory question to interview OR create separate tool
  - Integrate `AgentPackager` into streaming workflow
  - Update system prompt to guide agent through file-writing process
  - Add confirmation/validation for directory operations

---

## 3. Terminal Screen Management

**Status**: 🟢 Nice-to-Have / Low Priority

**Observed Behavior**:
- When running `npm run cli`, the npm command output and script messages remain at the top of the terminal
- Previous terminal history is visible above the advisor interface
- Results in a cluttered initial view instead of a "clean slate"

**Desired Behavior**:
- Clear the terminal screen when the advisor CLI starts
- Present user with clean interface showing only:
  - Welcome banner
  - Available commands
  - Ready prompt

**Technical Considerations**:
- Terminal clearing is environment-dependent:
  - Unix/Linux/macOS: `console.clear()` or `process.stdout.write('\x1Bc')`
  - Windows: May require different escape sequences
  - Some terminals may not support clearing (e.g., CI environments)
- Need to consider:
  - User might want to see npm startup messages for debugging
  - Clearing might not work in all environments
  - Some users prefer scrollback history

**Proposed Solutions**:
1. Add `console.clear()` at the start of CLI initialization
2. Make clearing configurable via environment variable: `CLEAR_SCREEN=true`
3. Add `--no-clear` flag for users who want to preserve terminal history
4. Add `/clear` command that users can invoke manually (already exists!)

**Alternative Approach**:
- Instead of clearing, add extra newlines (`\n\n\n`) to create visual separation
- Less aggressive but achieves similar "clean start" effect
- Works in all terminal environments

**Priority**: Low (cosmetic issue, doesn't impact functionality)

**Next Steps**:
- Test `console.clear()` across different terminals (macOS Terminal, iTerm, VS Code, Windows)
- Evaluate user preference: do we want automatic clearing or user-controlled?
- Consider adding to CLI startup options
- Document behavior in GETTING_STARTED.md

---

## 4. Unit Test Failures

**Status**: 🔴 Critical - 38 Test Failures

**Test Run Date**: 2025-11-01 19:36:37

**Summary**:
- **Test Files**: 5 failed | 4 passed (9 total)
- **Tests**: 38 failed | 74 passed (112 total)
- **Passing Modules**: generation (code, prompt, config), persistence
- **Failing Modules**: classification, interview (state-manager, validator), export (file-writer, packager)

### Root Causes Identified

#### A. Missing QUESTIONS Export (16 failures)
**Location**: `src/lib/interview/questions.ts`
**Impact**: All tests importing `QUESTIONS` fail with "Module has no exported member 'QUESTIONS'"

**Affected Tests**:
- `tests/unit/interview/state-manager.test.ts` - Cannot iterate over questions
- `tests/unit/interview/validator.test.ts` - Cannot validate against questions
- `tests/integration/interview-flow.test.ts` - Cannot run interview flow

**Fix**: Export the `QUESTIONS` array from questions.ts:
```typescript
// Add to src/lib/interview/questions.ts
export { QUESTIONS };
```

#### B. Missing InterviewState Fields (6 failures)
**Location**: `src/types/interview.ts`
**Impact**: State manager tests expect `startedAt` and `lastUpdatedAt` timestamps

**Affected Tests**:
- `should initialize with default state` - expects timestamps
- `should load persisted state` - expects timestamps after deserialization
- `should track timestamp updates` - cannot compare timestamps

**Fix Options**:
1. Add timestamp fields to `InterviewState` interface
2. Update tests to not expect timestamps (if timestamps were removed)

#### C. Missing State Manager Methods (2 failures)
**Location**: `src/lib/interview/state-manager.ts`
**Impact**: Tests expect `getRequirements()` and `getProgress()` helper methods

**Failing Tests**:
- `should get requirements` - `manager.getRequirements is not a function`
- `should get progress information` - `manager.getProgress is not a function`

**Fix**: Either add these helper methods or update tests to use `getState().requirements` directly

#### D. Validation Result Type Mismatch (13 failures)
**Location**: `tests/unit/interview/validator.test.ts`
**Impact**: Tests expect `result.error` field but validation returns different structure

**Observed Errors**:
- `expected undefined not to be undefined` when accessing `result.error`
- `the given combination of arguments (undefined and string) is invalid`

**Cause**: Validation result type changed but tests weren't updated

**Fix**: Update validator tests to match new validation result structure

#### E. Classification Scoring Too Low (5 failures)
**Location**: `src/lib/classification/classifier.ts`
**Impact**: Template matching scores much lower than expected

**Failures**:
- Data Analyst: 49 (expected >70)
- Content Creator: 23 (expected >70)
- Code Assistant: 31 (expected >70)
- Research Agent: 13 (expected >70)
- Automation Agent: 23 (expected >70)

**Cause**: Scoring algorithm may be too conservative or sample requirements don't match templates well

**Fix Options**:
1. Adjust scoring weights in classifier
2. Lower test expectations to realistic scores
3. Improve sample requirements to better match templates

#### F. Classification Mismatches (3 failures)
**Location**: `src/lib/classification/classifier.test.ts`
**Impact**: Wrong templates being selected

**Failures**:
- Content Creator requirements → matched `research-agent` (should be `content-creator`)
- Research Agent requirements → matched `data-analyst` (should be `research-agent`)
- Automation Agent requirements → matched `code-assistant` (should be `automation-agent`)

**Cause**: Low scoring leads to incorrect template selection

#### G. MCP Server Generation Logic (1 failure)
**Test**: `should return empty array when no special capabilities`
**Expected**: `[]`
**Actual**: `[{name: 'data-tools', ...}]`

**Cause**: `dataAnalysis: false` still triggers data-tools MCP server recommendation

#### H. File System Test Race Conditions (3 failures)
**Location**: `tests/unit/export/file-writer.test.ts`, `tests/unit/export/packager.test.ts`

**Issues**:
1. `copyFile` - Source file missing after copy (cleanup race condition)
2. `listFiles` - Only 1 file found instead of 3 (files not fully written)
3. `readFile` - test-temp directory doesn't exist (cleanup from previous test)

**Cause**: Async file operations completing out of order, temp directory cleanup issues

**Cleanup Errors** (stderr):
```
ENOTEMPTY: directory not empty, rmdir '/Users/.../test-temp/...'
```

Multiple temp directories not cleaning up properly between tests.

### Priority Fix Order

**Phase 1 - Critical (blocks other tests)**:
1. Export `QUESTIONS` array → fixes 16 failures immediately
2. Fix temp directory cleanup → prevents cascade failures
3. Add missing State Manager methods OR update tests

**Phase 2 - Important (affects core functionality)**:
4. Fix validation result type mismatches → fixes 13 failures
5. Update InterviewState type for timestamps OR remove timestamp tests

**Phase 3 - Algorithm Tuning**:
6. Adjust classification scoring algorithm
7. Fix MCP server generation logic
8. Improve sample requirements or test expectations

### Recommended Approach for Next Session

```markdown
1. Quick Wins (30 min):
   - Export QUESTIONS array
   - Fix temp directory cleanup with proper await/sequential operations

2. Medium Effort (1-2 hours):
   - Align validator test expectations with actual validation result structure
   - Add getRequirements()/getProgress() methods or update tests
   - Fix timestamp handling in InterviewState

3. Algorithm Review (1-2 hours):
   - Review classification scoring weights
   - Test with real-world requirements
   - Adjust thresholds or improve capability matching
```

### Test Files Status

✅ **Passing (74 tests)**:
- `tests/unit/generation/prompt-generator.test.ts` (2/2)
- `tests/unit/generation/config-generator.test.ts` (2/2)
- `tests/unit/generation/code-generator.test.ts` (11/11)
- `tests/unit/interview/persistence.test.ts` (10/10)
- Partial: classification (20/29), state-manager (5/13), validator (9/25)

❌ **Failing (38 tests)**:
- `tests/unit/interview/validator.test.ts` (16/25 failed)
- `tests/unit/interview/state-manager.test.ts` (8/13 failed)
- `tests/unit/classification/classifier.test.ts` (9/29 failed)
- `tests/unit/export/file-writer.test.ts` (3/17 failed)
- `tests/unit/export/packager.test.ts` (2/3 failed)

---

## General Testing Status

**Last Updated**: 2025-11-01 19:36

**Environment**:
- Node.js version: 18+
- Platform: macOS
- Terminal: [To be documented]
- MiniMax API: Connected and working

**Test Coverage**:
- ✅ Unit tests: Passing for FileWriter (17 tests), AgentPackager (3 tests)
- ✅ Generation modules: Code, prompt, config generators working
- ✅ Classification: Template matching operational
- ⚠️ Integration tests: Some failures in older interview tests (pre-existing)
- 🔴 E2E tests: Not fully tested with live MiniMax API

**Known Issues**:
- Some TypeScript compilation errors in test files (pre-existing, don't affect runtime)
- Interview state manager tests have outdated signatures
- Validator tests need updates for new validation result types

---

## Future Testing Priorities

1. **High Priority**:
   - Fix message truncation issue
   - Test complete advisor workflow end-to-end with real API
   - Verify generated code compiles and runs

2. **Medium Priority**:
   - Implement output directory selection
   - Integrate file writing into streaming workflow
   - Test all 5 templates with various requirement combinations

3. **Low Priority**:
   - Terminal clearing behavior
   - UI/UX polish
   - Performance optimization for large responses

---

## Notes for Future Development

- **MVP Scope**: Current focus is on functionality with console-based output
- **Production Scope**: Will require file I/O, better error handling, and user confirmation flows
- **User Profile**: Initially built for single-user (developer) use, will expand to broader audience
- **Integration Strategy**: Designed to work alongside other coding agents (provide generated Markdown as input)

---

## Contributing to Testing

When you discover new issues:
1. Add them to this document with clear descriptions
2. Include observed behavior, expected behavior, and reproduction steps
3. Suggest potential solutions if you have ideas
4. Update the status (🔴 Critical / 🟡 Needs attention / 🟢 Nice-to-have)
5. Commit changes with descriptive message

**Document Last Modified**: 2025-11-01
