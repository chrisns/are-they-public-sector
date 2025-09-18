# Implementation Plan: Welsh and Scottish Community Councils & NI Health Trusts

**Branch**: `012-welsh-community-councils` | **Date**: 2025-09-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-welsh-community-councils/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → No NEEDS CLARIFICATION markers found in spec
   → Detect Project Type: Single project (CLI aggregator)
   → Set Structure Decision: Option 1 (Single project)
3. Evaluate Constitution Check section below
   → No violations detected
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Research Wikipedia page structures and NI Direct format
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → Verify no new violations
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Add three new organisation types to the UK Public Sector Organisation Aggregator: Welsh Community Councils (from Wikipedia), Scottish Community Councils (from Wikipedia), and Northern Ireland Health and Social Care Trusts (from NI Direct). Each source requires HTML scraping to extract organisation data including names and all available metadata.

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 18+
**Primary Dependencies**: axios (HTTP requests), cheerio (HTML parsing), existing aggregator framework
**Storage**: JSON file output (existing pattern)
**Testing**: Jest with ts-jest
**Target Platform**: Node.js CLI application
**Project Type**: single - CLI aggregator tool
**Performance Goals**: Under 30 seconds per source (similar to existing scrapers)
**Constraints**: Must handle Wikipedia page structure variations, NI Direct website availability
**Scale/Scope**: ~1,100 Welsh councils, ~1,200 Scottish councils, 5 NI Health Trusts

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (CLI aggregator)
- Using framework directly? Yes (axios, cheerio directly)
- Single data model? Yes (Organisation interface)
- Avoiding patterns? Yes (simple fetcher/parser/mapper pattern)

**Architecture**:
- EVERY feature as library? Yes (fetcher, parser, mapper services)
- Libraries listed:
  - welsh-councils-fetcher: Fetch Welsh councils from Wikipedia
  - scottish-councils-fetcher: Fetch Scottish councils from Wikipedia
  - ni-health-trusts-fetcher: Fetch NI Health Trusts from NI Direct
  - community-councils-parser: Parse council data from HTML
  - health-trusts-parser: Parse health trust data from HTML
  - community-councils-mapper: Map to Organisation model
- CLI per library: Via main CLI with --source flags
- Library docs: Following existing pattern

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (real HTTP requests with mocked responses)
- Integration tests for: new libraries, contract changes, shared schemas? Yes
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? Yes (existing logger)
- Frontend logs → backend? N/A (CLI only)
- Error context sufficient? Yes

**Versioning**:
- Version number assigned? Following existing pattern
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (adding new sources)

## Project Structure

### Documentation (this feature)
```
specs/012-welsh-community-councils/
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
├── services/
│   ├── fetchers/
│   │   ├── welsh-councils-fetcher.ts
│   │   ├── scottish-councils-fetcher.ts
│   │   └── ni-health-trusts-fetcher.ts
│   ├── parsers/
│   │   ├── community-councils-parser.ts
│   │   └── health-trusts-parser.ts
│   └── mappers/
│       └── community-councils-mapper.ts
├── cli/
└── lib/

tests/
├── contract/
│   ├── welsh-councils.test.ts
│   ├── scottish-councils.test.ts
│   └── ni-health-trusts.test.ts
├── integration/
└── unit/
```

**Structure Decision**: Option 1 - Single project (existing CLI aggregator pattern)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Wikipedia page HTML structure for Welsh councils
   - Wikipedia page HTML structure for Scottish councils
   - NI Direct website structure and data format

2. **Generate and dispatch research agents**:
   ```
   Task: "Analyze Wikipedia Welsh councils page structure"
   Task: "Analyze Wikipedia Scottish councils page structure"
   Task: "Analyze NI Direct Health Trusts page structure"
   Task: "Research existing similar scrapers in codebase"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: HTML scraping with cheerio
   - Rationale: Consistent with existing scrapers, reliable parsing
   - Alternatives considered: API access (not available)

**Output**: research.md with all page structures documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Welsh Community Council: name, principal area, population, website
   - Scottish Community Council: name, council area, region, contact details
   - Health and Social Care Trust (NI): name, address, phone, services

2. **Generate API contracts** from functional requirements:
   - Service contracts for each fetcher
   - Parser contracts for HTML to data transformation
   - Mapper contracts for Organisation model mapping

3. **Generate contract tests** from contracts:
   - One test file per source type
   - Assert data structure and required fields
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Fetch and parse Welsh councils
   - Fetch and parse Scottish councils
   - Fetch and parse NI Health Trusts
   - Deduplicate and merge with existing data

5. **Update CLAUDE.md incrementally**:
   - Add new sources to project overview
   - Update commands section if needed
   - Add to recent changes

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Generate tasks from Phase 1 design docs
- Each fetcher → fetcher implementation task [P]
- Each parser → parser implementation task [P]
- Each mapper → mapper implementation task
- Integration with main CLI task
- Deduplication enhancement task

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Fetchers → Parsers → Mappers → Integration
- Mark [P] for parallel execution (independent sources)

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md

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
| None | - | - |

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
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*