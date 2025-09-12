# Implementation Plan: UK Public Sector Organisation Aggregator

**Branch**: `001-aggregator-of-data` | **Date**: 2025-09-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-aggregator-of-data/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
A data aggregation system that pulls organisation data from multiple UK government sources (GOV.UK API and ONS Excel files), maps their different schemas to a unified format, and outputs a comprehensive JSON file containing all UK public sector organisations with their classifications and relationships.

## Technical Context
**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: axios (HTTP client), xlsx (Excel parsing), minimal dependencies as specified  
**Storage**: File system (JSON output)  
**Testing**: Jest with 80% coverage requirement  
**Target Platform**: Node.js runtime  
**Project Type**: single - CLI data aggregator  
**Performance Goals**: Handle tens of thousands to low hundreds of thousands of records  
**Constraints**: Must handle dynamic Excel file links, data mapping across different schemas  
**Scale/Scope**: 3 data sources, ~100k+ organisation records

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (single CLI aggregator)
- Using framework directly? Yes (no wrapper classes)
- Single data model? Yes (unified Organisation model)
- Avoiding patterns? Yes (direct implementation, no unnecessary abstractions)

**Architecture**:
- EVERY feature as library? Yes - data fetching, parsing, mapping as separate modules
- Libraries listed:
  - `fetcher`: HTTP client for GOV.UK API and ONS HTML
  - `parser`: Excel and JSON parsing utilities
  - `mapper`: Data transformation and field mapping
  - `deduplicator`: Organisation deduplication logic
  - `writer`: JSON output generation
- CLI per library: Main CLI with commands for each stage
- Library docs: Will be documented inline

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Will be enforced
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual API calls with mocks for testing)
- Integration tests for: data sources, mapping logic, output generation
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? Yes (console output for progress)
- Frontend logs → backend? N/A (CLI only)
- Error context sufficient? Yes (source tracking, field mapping errors)

**Versioning**:
- Version number assigned? 0.1.0
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (first version)

## Project Structure

### Documentation (this feature)
```
specs/001-aggregator-of-data/
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
│   └── organisation.ts
├── services/
│   ├── fetcher.ts
│   ├── parser.ts
│   ├── mapper.ts
│   └── deduplicator.ts
├── cli/
│   └── index.ts
└── lib/
    └── writer.ts

tests/
├── contract/
├── integration/
├── mocks/
│   └── data/
└── unit/
```

**Structure Decision**: Option 1 - Single project (CLI aggregator)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Best practices for TypeScript project setup with minimal dependencies
   - Efficient Excel parsing with xlsx library
   - HTTP request handling with axios
   - Jest configuration for 80% coverage
   - Data mapping strategies for heterogeneous sources

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research TypeScript CLI setup with pnpm and tsx"
     Task: "Find best practices for parsing large Excel files with xlsx"
     Task: "Research data deduplication strategies for 100k+ records"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Organisation entity with unified fields
   - DataSource tracking for provenance
   - DataMapping configuration
   - AuditRecord for changes
   - DataConflict for discrepancies

2. **Generate API contracts** from functional requirements:
   - Input contracts for each data source
   - Output contract for unified JSON
   - Mapping rules documentation

3. **Generate contract tests** from contracts:
   - Test GOV.UK API response parsing
   - Test ONS Excel parsing
   - Test data mapping logic
   - Test JSON output structure

4. **Extract test scenarios** from user stories:
   - Successful aggregation from all sources
   - Handling missing/malformed data
   - Deduplication verification
   - Output validation

5. **Update agent file incrementally** (O(1) operation):
   - Create CLAUDE.md with TypeScript/Jest context
   - Include pnpm commands
   - Document test coverage requirements

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Testing tasks (TDD - must come first):
  - Contract tests for each data source [P]
  - Integration tests for aggregation flow
  - Unit tests for each service module [P]
- Implementation tasks:
  - TypeScript/Jest project setup
  - Data models implementation
  - Service modules (fetcher, parser, mapper, deduplicator, writer) [P]
  - CLI implementation
  - Mock data generation for tests

**Ordering Strategy**:
- TDD order: Tests before implementation (RED phase first)
- Dependency order: Setup → Models → Tests → Services → CLI → Integration
- Mark [P] for parallel execution where no dependencies exist

**Estimated Task Breakdown**:
- Project setup: 3 tasks
- Test creation: 8-10 tasks (must fail initially)
- Model implementation: 2-3 tasks
- Service implementation: 5-6 tasks
- CLI and integration: 3-4 tasks
- Total: ~25 tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations - all constitutional principles followed*

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