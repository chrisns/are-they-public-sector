# Implementation Plan: UK Courts and Tribunals Data Integration

**Branch**: `009-english-courts-can` | **Date**: 2025-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-english-courts-can/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project Type: Single (data aggregation service)
   → Structure Decision: Option 1 (single project)
3. Evaluate Constitution Check section below
   → Following TDD principles (tests first)
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Research CSV format, HTML structure, API endpoints
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach
8. STOP - Ready for /tasks command
```

## Summary
Integrate UK courts and tribunals data from three sources: England/Wales CSV, Northern Ireland HTML webpage, and Scotland web application. The system will fetch, parse, and standardize court information across all UK jurisdictions without deduplication.

## Technical Context
**Language/Version**: TypeScript 5.x with Node.js 18+
**Primary Dependencies**: axios (HTTP), cheerio (HTML parsing), csv-parse (CSV parsing)
**Storage**: JSON output files
**Testing**: Jest with ts-jest
**Target Platform**: Node.js CLI application
**Project Type**: single - data aggregation service
**Performance Goals**: Complete fetch in <30 seconds per source
**Constraints**: No browser automation, direct API/network requests only
**Scale/Scope**: ~400-500 courts total across three jurisdictions

## Constitution Check

**Simplicity**:
- Projects: 1 (single aggregation service)
- Using framework directly? Yes (no wrapper classes)
- Single data model? Yes (Court entity)
- Avoiding patterns? Yes (direct parsing, no unnecessary abstractions)

**Architecture**:
- EVERY feature as library? Yes (courts parsers as services)
- Libraries listed:
  - english-courts-parser: Parse CSV data
  - ni-courts-parser: Parse HTML webpage
  - scottish-courts-parser: Extract from API/network
  - courts-mapper: Map to Organisation model
- CLI per library: Each parser callable via CLI
- Library docs: Yes, following existing pattern

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual HTTP requests in integration tests)
- Integration tests for: new libraries, contract changes, shared schemas? Yes
- FORBIDDEN: Implementation before test - understood

**Observability**:
- Structured logging included? Yes
- Error context sufficient? Yes

**Versioning**:
- Version number assigned? Following existing pattern
- Breaking changes handled? N/A for initial implementation

## Project Structure

### Documentation (this feature)
```
specs/009-english-courts-can/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
# Option 1: Single project (SELECTED)
src/
├── models/
│   └── court.ts         # Court entity model
├── services/
│   ├── english-courts-parser.ts
│   ├── ni-courts-parser.ts
│   ├── scottish-courts-parser.ts
│   └── mappers/
│       └── courts-mapper.ts
├── cli/
│   └── orchestrator.ts  # Integration point
└── lib/

tests/
├── contract/
│   ├── english-courts-parser.contract.test.ts
│   ├── ni-courts-parser.contract.test.ts
│   └── scottish-courts-parser.contract.test.ts
├── integration/
│   └── courts.integration.test.ts
└── unit/
```

**Structure Decision**: Option 1 - Single project structure (data aggregation service)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - English CSV format and structure
   - NI webpage HTML structure
   - Scottish courts API endpoints

2. **Generate and dispatch research agents**:
   - Research English courts CSV format
   - Analyze NI courts webpage structure
   - Investigate Scottish courts network requests

3. **Consolidate findings** in `research.md`

**Output**: research.md with data source analysis

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Court entity with fields from all sources
   - Location, Contact, Services sub-entities
   - Validation rules for required fields

2. **Generate API contracts** from functional requirements:
   - Parser contracts for each source
   - Mapper contract for Organisation transformation

3. **Generate contract tests** from contracts:
   - Test files for each parser
   - Tests must fail initially (TDD)

4. **Extract test scenarios** from user stories:
   - Fetch and parse English CSV
   - Extract NI courts from HTML
   - Retrieve Scottish courts via API

5. **Update CLAUDE.md incrementally**:
   - Add courts integration context
   - Update recent changes section

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do*

**Task Generation Strategy**:
- T001-T004: Contract test creation for parsers and mapper [P]
- T005-T006: Court model and enums creation [P]
- T007-T009: Parser implementations (English, NI, Scottish)
- T010: Courts mapper implementation
- T011-T013: Integration tests for each parser
- T014: Full courts integration test
- T015: Orchestrator integration
- T016-T018: CLI commands for each parser
- T019-T020: Documentation and validation

**Ordering Strategy**:
- Tests first (T001-T004) - must fail initially per TDD
- Models second (T005-T006) - needed by parsers
- Parsers third (T007-T009) - can be parallel after models
- Mapper fourth (T010) - needs Court model
- Integration tests (T011-T014) - after implementations
- Orchestrator last (T015) - integrates everything

**Task Dependencies**:
- Models → Parsers → Mapper → Orchestrator
- Contract tests can be written in parallel [P]
- Parser implementations can be parallel after models [P]
- Integration tests sequential after implementations

**Estimated Output**: 20 numbered tasks in tasks.md with clear dependencies

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md)
**Phase 5**: Validation (run tests, execute quickstart.md)

## Complexity Tracking
*No violations - following constitutional principles*

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*