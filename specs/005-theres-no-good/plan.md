# Implementation Plan: Schools Data Aggregation

**Branch**: `005-theres-no-good` | **Date**: 2025-09-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-theres-no-good/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project Type: Single (CLI aggregator tool)
   → Structure Decision: Option 1 (Single project)
3. Evaluate Constitution Check section below
   → No violations identified
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Research GIAS API structure and response format
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → Verify no new violations
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

## Summary
Aggregate all UK schools data from the Get Information About Schools (GIAS) service using paginated JSON requests. The system will fetch all open schools incrementally (100 records per page), handle network errors with exponential backoff, and extract all available attributes into a unified format for analysis alongside other public sector data.

## Technical Context
**Language/Version**: TypeScript 5.x (from existing codebase)  
**Primary Dependencies**: axios (HTTP client), cheerio (HTML parsing if needed)  
**Storage**: JSON files (consistent with existing aggregator pattern)  
**Testing**: Jest with ts-jest (80% coverage requirement from CLAUDE.md)  
**Target Platform**: Node.js 18+ with tsx runtime  
**Project Type**: single - CLI aggregator tool  
**Performance Goals**: Complete aggregation within reasonable time (est. 300+ requests)  
**Constraints**: Handle rate limiting, network failures, format changes gracefully  
**Scale/Scope**: ~30,000+ open schools expected across all types

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (single CLI aggregator)
- Using framework directly? Yes (axios for HTTP, no wrappers)
- Single data model? Yes (School entity with all source attributes)
- Avoiding patterns? Yes (direct implementation, no unnecessary abstractions)

**Architecture**:
- EVERY feature as library? Yes (schools-parser service)
- Libraries listed: schools-parser (fetches and parses GIAS data)
- CLI per library: cli/index.ts with --help/--version/--format
- Library docs: llms.txt format planned? Yes (in Phase 1)

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Will enforce
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual HTTP requests in integration tests)
- Integration tests for: new libraries, contract changes, shared schemas? Yes
- FORBIDDEN: Implementation before test, skipping RED phase - Acknowledged

**Observability**:
- Structured logging included? Yes (existing pattern)
- Frontend logs → backend? N/A (CLI tool only)
- Error context sufficient? Yes (detailed error reporting planned)

**Versioning**:
- Version number assigned? Will follow existing pattern
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (new feature)

## Project Structure

### Documentation (this feature)
```
specs/005-theres-no-good/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
│   └── school.ts        # School entity interface
├── services/
│   └── schools-parser.ts # GIAS data fetcher/parser
├── cli/
│   └── index.ts         # Updated with schools command
└── lib/
    └── writer.ts        # Existing JSON writer

tests/
├── contract/
│   └── schools-parser.contract.test.ts
├── integration/
│   └── schools-aggregation.integration.test.ts
└── unit/
    └── schools-parser.unit.test.ts
```

**Structure Decision**: Option 1 (Single project) - consistent with existing aggregator pattern

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - GIAS JSON response structure and fields
   - Pagination behavior and edge cases
   - Rate limiting policies
   - Error response formats

2. **Generate and dispatch research agents**:
   ```
   Task: "Research GIAS JSON API response structure"
   Task: "Find pagination patterns and total count handling"
   Task: "Identify rate limiting and retry strategies"
   Task: "Analyze error handling patterns for network failures"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - School entity with all GIAS attributes
   - Validation rules (name mandatory)
   - Status filtering (open schools only)

2. **Generate API contracts** from functional requirements:
   - SchoolsParser.fetchPage(startIndex) → School[]
   - SchoolsParser.fetchAll() → School[]
   - Output TypeScript interfaces to `/contracts/`

3. **Generate contract tests** from contracts:
   - Test pagination logic
   - Test retry with backoff
   - Test deduplication
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Complete aggregation scenario
   - Network failure recovery
   - Format change detection
   - Quickstart test = full aggregation flow

5. **Update CLAUDE.md incrementally**:
   - Add schools data source info
   - Update recent changes
   - Keep under 150 lines

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md update

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Contract tests for SchoolsParser methods [P]
- School model creation task [P]
- Integration test for full aggregation flow
- Implementation tasks for parser service

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Models → Services → CLI integration
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*