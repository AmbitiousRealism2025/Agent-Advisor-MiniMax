# Functional Test Guide: Agent Advisor MVP

**Test Date**: _____________
**Tester**: _____________
**Branch**: `dev`
**Commit**: `9bc60df`

## Test Scenario: Building a Research Agent for Academic Literature Review

This guide walks you through a complete end-to-end test of the Agent Advisor system by building a **Research Agent** that helps academics find, analyze, and summarize scientific papers.

**Estimated Time**: 20-30 minutes

---

## Prerequisites Checklist

Before starting, verify:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Repository cloned and on `dev` branch
- [ ] Dependencies installed (`npm install`)
- [ ] Build completed successfully (`npm run build`)
- [ ] `MINIMAX_JWT_TOKEN` set in `.env` file
- [ ] No other sessions running in `sessions/` directory (optional: clear old sessions)

---

## Part 1: Environment Setup (5 min)

### Step 1.1: Verify Build Status

```bash
cd /Users/ambrealismwork/Desktop/Coding-Projects/agent_advisor-minimax-mvp
npm run build
```

**Expected Output**:
- ✅ TypeScript compilation succeeds
- ✅ `dist/` directory created with compiled files
- ✅ No errors in console

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 1.2: Verify Environment Configuration

```bash
# Check that JWT token is set
cat .env | grep MINIMAX_JWT_TOKEN
```

**Expected Output**:
- ✅ Shows `MINIMAX_JWT_TOKEN=<your-token>`
- ✅ Token is not empty
- ✅ Token is on ONE SINGLE LINE (no line breaks)
- ✅ Token follows JWT format: `header.payload.signature` (three parts separated by dots)

**Common Issues**:
- ❌ **Token split across multiple lines**: Must be on single line
- ❌ **Empty `CLI_PATH=`**: This is fine - leave it empty if you don't have Claude CLI
- ❌ **Example token from jwt.io**: Won't work with MiniMax API - need real token from https://www.minimaxi.com/

**Troubleshooting**:
If you see `❌ MiniMax configuration error: String must contain at least 1 character(s)`:
1. Check if token has line breaks - join into single line
2. Check if `CLI_PATH=` is empty - this is OK, error is misleading
3. Verify token format matches JWT pattern (three base64 segments with dots)

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 1.3: Clear Previous Sessions (Optional)

```bash
# Optional: Start with clean session state
rm -rf sessions/*
```

**Expected Output**:
- ✅ `sessions/` directory empty or doesn't exist

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 2: Launch Interactive CLI (2 min)

### Step 2.1: Start the Advisor CLI

```bash
npm run cli
```

**Expected Behavior**:
- ✅ Console clears (default behavior)
- ✅ Welcome banner appears with ASCII art
- ✅ Shows available commands (`/help`, `/exit`, etc.)
- ✅ Displays prompt: `You: `
- ✅ No error messages

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 2.2: Test Help Command

**Input**:
```
/help
```

**Expected Output**:
- ✅ Lists all available commands
- ✅ Shows: `/help`, `/exit`, `/quit`, `/clear`, `/history`, `/save`, `/load`, `/status`, `/templates`
- ✅ Explains query mode (non-slash inputs)

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 2.3: Test Templates Command

**Input**:
```
/templates
```

**Expected Output**:
- ✅ Lists all 5 agent templates:
  - `data-analyst`
  - `content-creator`
  - `code-assistant`
  - `research-agent`
  - `automation-agent`
- ✅ Shows brief descriptions for each

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 3: Interactive Interview Phase (10 min)

### Step 3.1: Start Interview

**Input**:
```
I want to build an agent that helps researchers find and analyze academic papers
```

**Expected Behavior**:
- ✅ Advisor acknowledges your request
- ✅ Begins asking interview questions
- ✅ First question appears (likely about agent name/purpose)
- ✅ Streaming responses visible in real-time
- ✅ Thinking blocks may appear (truncated to ~300 chars)

**Known Warnings (Safe to Ignore)**:
- ⚠️ `Warning: Unrecognized tool "mcp__advisor-tools__ask_interview_question"` - This is harmless. The SDK resolves the tool correctly despite the warning. The advisor will continue to function normally.

**Troubleshooting**:
- If CLI hangs at "Agent Advisor Starting..." without questions appearing:
  - Check if you're using a real MiniMax JWT token (example tokens from jwt.io won't work)
  - Verify token is valid: Visit https://www.minimaxi.com/ to get/verify your token
  - Check network connectivity to MiniMax API
  - Press Ctrl+C and retry with valid credentials

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 3.2: Answer Interview Questions

Follow this script to answer the advisor's questions. The advisor should ask ~15 questions across 4 stages.

**IMPORTANT**:
- Answer ONE question at a time
- Wait for the advisor to ask the next question before providing the next answer
- DO NOT paste multi-line answers or table format - readline will treat each line as a separate input
- Copy/paste the answer text WITHOUT quotes

**Stage 1: Basic Information**

**Question 1 - Agent Name**
```
Academic Research Assistant
```

**Question 2 - Primary Purpose**
```
Help researchers find relevant scientific papers, extract key findings, and generate literature review summaries
```

**Question 3 - Target Users**
```
Graduate students and academic researchers in STEM fields
```

---

**Stage 2: Functional Requirements**

**Question 4 - Key Capabilities**
```
Search academic databases like PubMed and arXiv, extract paper metadata (title, authors, abstract, citations), summarize findings, and identify research gaps
```

**Question 5 - Input Data**
```
Search queries (keywords, topics), paper URLs, DOIs, and research questions
```

**Question 6 - Output Format**
```
Structured summaries with key findings, citation information, and relevance scores. Export to Markdown or JSON
```

**Question 7 - User Interaction**
```
Conversational queries like 'Find papers about CRISPR gene editing published after 2020' or 'Summarize the methodology from this paper: [DOI]'
```

---

**Stage 3: Technical Requirements**

**Question 8 - External APIs**
```
Yes - PubMed API for medical research, arXiv API for physics/CS papers, and Semantic Scholar API for citation data
```

**Question 9 - Data Processing**
```
Parse XML/JSON from APIs, extract structured metadata, calculate relevance scores, and generate summaries
```

**Question 10 - Error Handling**
```
Handle API rate limits, invalid DOIs, network timeouts, and papers behind paywalls gracefully
```

**Question 11 - Performance**
```
Process 10-20 papers per query within 30 seconds. Cache frequently accessed papers
```

---

**Stage 4: Context & Constraints**

**Question 12 - Deployment**
```
Local execution for now, potentially cloud deployment later
```

**Question 13 - Timeline**
```
MVP in 2 weeks, full feature set in 1 month
```

**Question 14 - Additional Context**
```
Focus on open-access papers initially. Add support for institutional access later
```

---

**Expected Behavior Throughout Interview**:
- ✅ Advisor asks follow-up questions based on your answers
- ✅ Questions progress logically through the 4 stages
- ✅ Advisor provides feedback and clarifications
- ✅ Interview state saved automatically after each response
- ✅ Message count increments visible in session metadata

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 3.3: Check Interview Status

**Input**:
```
/status
```

**Expected Output**:
- ✅ Shows current interview stage (e.g., "Stage 4/4")
- ✅ Lists answered questions count (e.g., "12/15 questions answered")
- ✅ Shows gathered requirements summary
- ✅ Indicates if interview is complete

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 4: Classification & Recommendation (3 min)

### Step 4.1: Request Classification

After completing the interview, the advisor should automatically proceed to classification. If not, you can prompt:

**Input** (if needed):
```
What type of agent should I build based on my requirements?
```

**Expected Behavior**:
- ✅ Advisor analyzes your requirements
- ✅ Recommends **Research Agent** template (should be top match)
- ✅ Provides confidence score/reasoning
- ✅ May suggest alternative templates (e.g., Data Analyst as secondary option)
- ✅ Explains why Research Agent is the best fit

**Expected Match**:
- **Primary**: `research-agent` (85-95% confidence)
- **Secondary**: `data-analyst` or `content-creator` (possible alternatives)

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 4.2: Review Template Capabilities

**Expected Output**:
- ✅ Lists Research Agent's built-in tools:
  - `search_web` - Web search functionality
  - `extract_content` - Content extraction from URLs
  - `verify_facts` - Fact-checking and source verification
  - `analyze_sources` - Source credibility analysis
- ✅ Explains how these tools map to your requirements
- ✅ Identifies any gaps or customization needs

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 5: Code Generation (5 min)

### Step 5.1: Request Agent Code Generation

**Input**:
```
Generate the agent code for my Research Assistant
```

**Expected Behavior**:
- ✅ Advisor generates TypeScript code
- ✅ Output formatted as Markdown with code fences
- ✅ File header appears: `### File: \`agent.ts\``
- ✅ Code includes:
  - Proper imports from `@anthropic-ai/agent-sdk`
  - Zod schemas for tool parameters
  - Tool definitions (search, extract, verify, analyze)
  - Agent initialization with MiniMax config
  - Main execution function
- ✅ Copy instructions appear after code block
- ✅ Visual separator with helpful tip

**Code Quality Checks**:
- ✅ Uses `.js` extensions in imports (ESM compatibility)
- ✅ Proper async/await patterns
- ✅ Type-safe tool definitions
- ✅ Error handling present
- ✅ No `TODO` comments or placeholder code
- ✅ Customized for academic research use case

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 5.2: Request System Prompt Generation

**Input**:
```
Generate the system prompt for my agent
```

**Expected Behavior**:
- ✅ Generates customized system prompt
- ✅ Output formatted as Markdown
- ✅ File header: `### File: \`system-prompt.md\``
- ✅ Prompt includes:
  - Clear role definition ("Academic Research Assistant")
  - Capabilities description (search, extract, summarize)
  - User interaction guidelines
  - Output format specifications
  - Error handling instructions
  - Best practices for research tasks
- ✅ Tailored to your specific requirements (STEM focus, open-access papers)

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 5.3: Request Configuration Files

**Input**:
```
Generate the configuration files
```

**Expected Behavior**:
- ✅ Generates multiple config files
- ✅ Each file in separate code fence with header
- ✅ Files include:
  - `package.json` - Dependencies, scripts, metadata
  - `tsconfig.json` - TypeScript configuration
  - `.env.example` - Environment variable template
  - `README.md` - Project overview and setup instructions
- ✅ Config values customized for your agent
- ✅ All JSON properly formatted and valid

**Validation Checks**:
- ✅ `package.json` includes `@anthropic-ai/agent-sdk`
- ✅ `package.json` has proper `"type": "module"`
- ✅ `tsconfig.json` has ESM settings
- ✅ `.env.example` includes `MINIMAX_JWT_TOKEN` placeholder
- ✅ README mentions your specific use case

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 6: Implementation Guide & Export (3 min)

### Step 6.1: Request Implementation Guide

**Input**:
```
Generate the implementation guide
```

**Expected Behavior**:
- ✅ Generates comprehensive implementation documentation
- ✅ Output formatted as Markdown
- ✅ Includes sections:
  - **Overview** - Agent purpose and capabilities
  - **Prerequisites** - Node.js version, API keys
  - **Installation** - Step-by-step setup instructions
  - **Configuration** - Environment variable setup
  - **Usage Examples** - Sample queries and expected outputs
  - **Testing** - How to test the agent
  - **Deployment** - Deployment considerations
  - **Troubleshooting** - Common issues and solutions
  - **Next Steps** - Suggested improvements
- ✅ Examples use your specific use case (academic papers)
- ✅ Numbered steps with clear instructions

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 6.2: Save Generated Output

**Input**:
```
/save academic-research-agent.md
```

**Expected Behavior**:
- ✅ CLI captures all previous advisor output
- ✅ Saves to file: `academic-research-agent.md`
- ✅ Confirmation message appears
- ✅ File path shown in output

**Verification**:
```bash
# In a separate terminal
ls -lh academic-research-agent.md
head -20 academic-research-agent.md
```

**Expected**:
- ✅ File exists and has content (>10KB typical)
- ✅ Contains all code blocks and documentation
- ✅ Properly formatted Markdown

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 7: Session Management (3 min)

### Step 7.1: Check Conversation History

**Input**:
```
/history
```

**Expected Output**:
- ✅ Shows all conversation messages
- ✅ Includes your queries and advisor responses
- ✅ Displays message count (likely 20-30 messages)
- ✅ Shows timestamps

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 7.2: Exit and Verify Session Persistence

**Input**:
```
/exit
```

**Expected Behavior**:
- ✅ CLI shows goodbye message
- ✅ Process exits cleanly
- ✅ Session saved automatically

**Verification**:
```bash
# Check session was saved
ls -la sessions/
```

**Expected**:
- ✅ Session file exists with recent timestamp
- ✅ File is valid JSON

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 7.3: Test Session Resume

**Action**: Restart the CLI

```bash
npm run cli
```

**Expected Behavior**:
- ✅ CLI automatically loads most recent session
- ✅ Shows session info (message count, start time, last activity)
- ✅ Displays: "Resuming previous session..."
- ✅ Conversation context restored

**Test Resume**:

**Input**:
```
What was the name of the agent we just built?
```

**Expected Response**:
- ✅ Advisor correctly references "Academic Research Assistant"
- ✅ Demonstrates memory of previous conversation
- ✅ No need to repeat requirements

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 7.4: Test Load Command

**Input**:
```
/load
```

**Expected Output**:
- ✅ Lists all available sessions
- ✅ Shows session IDs with timestamps
- ✅ Indicates current session (if any)
- ✅ Provides load instructions

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 8: Generated Code Validation (5 min)

### Step 8.1: Extract Code from Saved File

**Action**: Manually copy the generated agent code from `academic-research-agent.md`

1. Open `academic-research-agent.md`
2. Find the `### File: \`agent.ts\`` section
3. Copy the TypeScript code (inside the triple backticks)
4. Create test directory:

```bash
mkdir -p test-agent
cd test-agent
```

5. Save the code to `agent.ts`
6. Copy other files similarly (package.json, tsconfig.json, etc.)

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 8.2: Install Dependencies

```bash
# In test-agent/ directory
npm install
```

**Expected Behavior**:
- ✅ All dependencies install successfully
- ✅ No peer dependency warnings
- ✅ `@anthropic-ai/agent-sdk` installed
- ✅ `node_modules/` created

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 8.3: TypeScript Compilation Test

```bash
# In test-agent/ directory
npx tsc --noEmit
```

**Expected Behavior**:
- ✅ No compilation errors
- ✅ No type errors
- ✅ Imports resolve correctly
- ⚠️ Module resolution warnings acceptable (isolated context)

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 8.4: Code Quality Spot Check

Manually review `agent.ts` for quality indicators:

**Checklist**:
- ✅ No `TODO` comments
- ✅ No `throw new Error("Not implemented")`
- ✅ All functions have implementations
- ✅ Proper error handling (try/catch blocks)
- ✅ Zod schemas defined for all tool parameters
- ✅ Tool handlers return properly formatted responses
- ✅ Uses `.js` extensions in imports
- ✅ Async/await used correctly
- ✅ No hardcoded API keys or secrets

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 9: Edge Cases & Error Handling (3 min)

### Step 9.1: Test Invalid Command

**Action**: Restart CLI if needed

**Input**:
```
/invalid-command
```

**Expected Behavior**:
- ✅ Shows error message or help hint
- ✅ CLI doesn't crash
- ✅ Remains responsive

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 9.2: Test Screen Clearing Control

**Action**: Exit and restart with flag

```bash
npm run cli -- --no-clear
```

**Expected Behavior**:
- ✅ Terminal history preserved
- ✅ No screen clear on startup
- ✅ CLI still functions normally

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 9.3: Test Empty Query

**Input**:
```
(press Enter without typing anything)
```

**Expected Behavior**:
- ✅ CLI handles gracefully (ignores or shows hint)
- ✅ No crash or error
- ✅ Returns to prompt

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Part 10: Final Verification (2 min)

### Step 10.1: Clean Exit

**Input**:
```
/exit
```

**Expected Behavior**:
- ✅ Goodbye message appears
- ✅ Session saved automatically
- ✅ Process exits with code 0
- ✅ No error messages

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

### Step 10.2: Verify Test Artifacts

```bash
# From project root
ls -lh academic-research-agent.md
ls -lh sessions/
ls -lh test-agent/
```

**Expected**:
- ✅ `academic-research-agent.md` exists and has content
- ✅ Session file(s) in `sessions/` directory
- ✅ `test-agent/` has all generated files

**Result**: ☐ PASS / ☐ FAIL
**Notes**: _______________________________________

---

## Test Results Summary

**Total Tests**: 32
**Passed**: ______ / 32
**Failed**: ______ / 32
**Pass Rate**: ______%

---

## Critical Issues Found

| Issue # | Severity | Description | Steps to Reproduce |
|---------|----------|-------------|-------------------|
| 1 | 🔴 / 🟡 / 🟢 |  |  |
| 2 | 🔴 / 🟡 / 🟢 |  |  |
| 3 | 🔴 / 🟡 / 🟢 |  |  |

Legend: 🔴 Critical (blocks usage) | 🟡 Important (degrades UX) | 🟢 Minor (cosmetic/nice-to-have)

---

## Non-Critical Observations

_______________________________________
_______________________________________
_______________________________________

---

## Performance Notes

**Interview Duration**: ______ minutes
**Generation Duration**: ______ minutes
**Total Session Time**: ______ minutes
**Response Latency**: Fast / Moderate / Slow
**Thinking Block Truncation**: Working / Not Working / Not Observed

---

## Recommendations

### Must Fix Before Release
1. _______________________________________
2. _______________________________________

### Should Fix Soon
1. _______________________________________
2. _______________________________________

### Nice to Have
1. _______________________________________
2. _______________________________________

---

## Tester Sign-Off

**Name**: _______________________________________
**Date**: _______________________________________
**Overall Assessment**: ☐ Ready for Release / ☐ Needs Fixes / ☐ Major Issues

**Additional Comments**:
_______________________________________
_______________________________________
_______________________________________

---

## Appendix: Quick Reference

### Expected File Structure After Test

```
agent_advisor-minimax-mvp/
├── academic-research-agent.md          # Saved output
├── sessions/
│   └── <session-id>.json              # Persisted session
└── test-agent/                         # Extracted agent project
    ├── agent.ts
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── README.md
```

### Key Success Metrics

1. **Interview Completion**: All 15 questions answered smoothly
2. **Correct Classification**: Research Agent recommended (85%+ confidence)
3. **Code Quality**: No compilation errors, no TODOs, no placeholders
4. **Session Persistence**: Resume works correctly after restart
5. **Output Format**: All Markdown properly formatted with code fences
6. **User Experience**: Clear prompts, helpful messages, no crashes

---

**End of Functional Test Guide**
