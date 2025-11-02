# End-to-End Test Suite

Comprehensive E2E tests for the Agent Advisor workflow.

## Test Files

### advisor-workflow.test.ts
Tests the complete advisor workflow from interview through generation.
- Full workflow: interview → classification → generation
- Markdown output validation
- Code extraction and compilation
- Multi-template coverage

### conversation-state.test.ts
Tests conversation state persistence and multi-turn interactions.
- Session save/load functionality
- Conversation metadata tracking
- Interview resume capability
- CLI restart simulation

### markdown-output-validation.test.ts
Tests Markdown output format from all generation tools.
- Code generation Markdown structure
- System prompt Markdown structure
- Config files Markdown structure
- Implementation guide Markdown structure
- Cross-template consistency

### code-compilation-validation.test.ts
Tests that generated code compiles when extracted from Markdown.
- TypeScript compilation validation
- JSON config validation
- Code quality checks
- Tool definition validation
- Template-specific tool verification

### template-*.test.ts
Template-specific E2E tests for each of the 5 templates.
- Data Analyst template
- Content Creator template
- Code Assistant template
- Research Agent template
- Automation Agent template

### all-templates.test.ts
Cross-template validation tests.
- All templates generate valid code
- Unique code per template
- Appropriate dependencies per template
- Correct classification

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test file
npm test tests/e2e/advisor-workflow.test.ts

# Run with coverage
npm run test:coverage -- tests/e2e

# Run in watch mode
npm run test:watch -- tests/e2e
```

## Test Coverage

E2E tests cover:
- ✅ Complete advisor workflow (interview → classification → generation)
- ✅ All 5 agent templates
- ✅ Markdown output format validation
- ✅ Code extraction and compilation
- ✅ Conversation state persistence
- ✅ Multi-turn interview sessions
- ✅ Session save/load/resume
- ✅ JSON config validation
- ✅ TypeScript code quality
- ✅ Tool definition validation

## Test Utilities

E2E tests use utilities from `tests/utils/`:
- `markdown-validator.ts` - Markdown parsing and validation
- `test-helpers.ts` - Factory functions, compilation, file operations

## Test Fixtures

E2E tests use fixtures from `tests/fixtures/`:
- `sample-requirements.ts` - Agent requirements for all 5 templates
- `sample-responses.ts` - Interview response sets

## Known Limitations

- Tests do not make live MiniMax API calls (use direct module calls)
- Compilation tests expect module resolution errors (dependencies not installed in temp dirs)
- Tests use temporary directories for file operations (cleaned up after each test)
- Longer timeouts required for compilation tests (10-20 seconds)

## Troubleshooting

**Compilation tests failing**:
- Ensure TypeScript is installed: `npm install`
- Check temp directory cleanup: `rm -rf test-temp/`
- Increase test timeout if needed

**Markdown validation failing**:
- Check tool handler output format matches expected structure
- Verify code blocks have proper language tags
- Ensure file headers precede code blocks

**State persistence tests failing**:
- Check session directory exists: `sessions/`
- Verify file permissions for session storage
- Clean up old sessions: `rm -rf sessions/test-*`

## Contributing

When adding new E2E tests:
1. Follow existing test structure and naming conventions
2. Use test fixtures for consistent data
3. Use test utilities for common operations
4. Add appropriate timeouts for async operations
5. Clean up resources in afterEach hooks
6. Document test purpose and expected behavior
7. Update this README with new test coverage
