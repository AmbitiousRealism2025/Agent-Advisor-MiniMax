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

## General Testing Status

**Last Updated**: 2025-11-01

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
