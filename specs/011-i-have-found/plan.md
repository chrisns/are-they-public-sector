# Implementation Plan: Replace GIAS School Data Collection Method

**Branch**: `011-i-have-found` | **Date**: 2025-09-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-i-have-found/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✓ Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✓ No NEEDS CLARIFICATION markers found
   → Detected Project Type: Single (TypeScript CLI aggregator)
   → Set Structure Decision: Option 1 (single project)
3. Evaluate Constitution Check section below
   → ✓ No violations detected
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → ✓ Research completed (technical approach documented)
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✓ Contracts generated (gias-csv-fetcher-contract.ts)
   → ✓ Data model documented (school entity, mappings)
   → ✓ Quickstart guide created
   → ✓ CLAUDE.md updated
6. Re-evaluate Constitution Check section
   → ✓ No new violations introduced
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach
   → ✓ Task strategy documented below
8. STOP - Ready for /tasks command
```

## Summary
Replace the existing GIAS school data JSON scraping approach with a direct CSV download method based on the proven implementation in test/gias.js. This will significantly improve performance (from minutes to under 30 seconds) and reliability by using the official GIAS download service instead of scraping JSON endpoints.

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 18+
**Primary Dependencies**: axios (HTTP client), zlib (compression), csv-parse (CSV parsing)
**Storage**: Local filesystem (CSV files), in-memory processing
**Testing**: Jest with ts-jest
**Target Platform**: Linux/macOS/Windows (Node.js runtime)
**Project Type**: single - TypeScript CLI aggregator
**Performance Goals**: Complete GIAS data fetch in under 30 seconds
**Constraints**: Must handle ~52,000 school records, manage session cookies, handle CSRF tokens
**Scale/Scope**: ~52,000 schools, single data source replacement

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (single TypeScript aggregator)
- Using framework directly? Yes (axios, no wrappers)
- Single data model? Yes (School entity)
- Avoiding patterns? Yes (direct implementation)

**Architecture**:
- EVERY feature as library? Yes (gias-csv-fetcher service)
- Libraries listed:
  - gias-csv-fetcher: Direct CSV download from GIAS
  - schools-mapper: Map CSV data to Organisation model
- CLI per library: Orchestrator integration only
- Library docs: Will follow existing pattern

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual GIAS service)
- Integration tests for: new library, contract changes
- FORBIDDEN: No implementation before tests

**Observability**:
- Structured logging included? Yes (existing logger)
- Frontend logs → backend? N/A (CLI only)
- Error context sufficient? Yes

**Versioning**:
- Version number assigned? 0.1.0 (existing)
- BUILD increments on every change? Yes
- Breaking changes handled? Yes (removing old code)

## Project Structure

### Documentation (this feature)
```
specs/011-i-have-found/
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
│   └── school.ts         # Existing, may need updates
├── services/
│   ├── gias-csv-fetcher.ts  # NEW - Replace schools-fetcher.ts
│   └── mappers/
│       └── schools-mapper.ts # Update for CSV format
├── cli/
│   └── orchestrator.ts   # Update to use new fetcher
└── lib/
    └── csv-utils.ts      # NEW - CSV parsing utilities

tests/
├── contract/
│   └── gias-csv-fetcher.contract.test.ts  # NEW
├── integration/
│   └── gias-csv.integration.test.ts       # NEW
└── unit/
    └── csv-utils.test.ts                  # NEW
```

**Structure Decision**: Option 1 (Single project) - TypeScript CLI aggregator

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - ✓ No NEEDS CLARIFICATION items
   - Research GIAS download service behavior
   - Study test/gias.js implementation patterns
   - Understand CSV format and fields

2. **Generate and dispatch research agents**:
   - Analyzed test/gias.js for implementation approach
   - Identified key technical requirements:
     - Session cookie management
     - CSRF token extraction
     - ZIP file extraction
     - CSV parsing approach

3. **Consolidate findings** in `research.md`:
   - Decision: Direct CSV download via GIAS Downloads service
   - Rationale: Official method, faster, more reliable
   - Alternatives considered: Continue JSON scraping (rejected due to performance)

**Output**: research.md with implementation approach documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - School entity with GIAS fields
   - Session state for download process
   - CSV parsing configuration

2. **Generate API contracts** from functional requirements:
   - GIASCSVFetcher service contract
   - CSV parser contract
   - Mapper update contract

3. **Generate contract tests** from contracts:
   - Tests for successful download
   - Tests for session management
   - Tests for CSV parsing
   - Tests for error scenarios

4. **Extract test scenarios** from user stories:
   - Complete download in under 30 seconds
   - Handle 52,000 records successfully
   - Graceful error handling

5. **Update CLAUDE.md incrementally**:
   - Add new GIAS CSV fetcher to current feature
   - Update commands section

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md updates

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Remove old JSON scraping code tasks
- Create GIAS CSV fetcher service tasks
- Update mapper for CSV format tasks
- Integration with orchestrator tasks
- Test implementation tasks

**Ordering Strategy**:
- TDD order: Contract tests → Implementation → Integration
- Dependency order: Remove old → Add new → Integrate
- Mark [P] for parallel execution where possible

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations - section not needed*

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
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*