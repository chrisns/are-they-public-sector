# Implementation Plan: Add UK Colleges (Scotland, Wales, Northern Ireland)

**Branch**: `007-we-re-already` | **Date**: 2025-09-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-we-re-already/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → SUCCESS: Feature spec loaded
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type: single (TypeScript CLI aggregator)
   → Set Structure Decision: Option 1 (single project)
3. Evaluate Constitution Check section below
   → No violations detected
   → Update Progress Tracking: Initial Constitution Check PASS
4. Execute Phase 0 → research.md
   → Research AoC webpage structure
   → Research PDF parsing capabilities
   → Document findings
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → No new violations
   → Update Progress Tracking: Post-Design Constitution Check PASS
7. Plan Phase 2 → Task generation approach defined
8. STOP - Ready for /tasks command
```

## Summary
Add support for colleges from Scotland, Wales, and Northern Ireland by fetching the AoC webpage, extracting PDF links, downloading PDFs, parsing college names from PDF tables, and integrating with existing English colleges data. Must validate counts match webpage display.

## Technical Context
**Language/Version**: TypeScript 5.x
**Primary Dependencies**: axios (HTTP), pdf-parse (PDF parsing), cheerio (HTML parsing)
**Storage**: JSON file output
**Testing**: Jest with ts-jest
**Target Platform**: Node.js 18+ CLI
**Project Type**: single (TypeScript CLI aggregator)
**Performance Goals**: Process 3 PDFs in <30 seconds
**Constraints**: Must fail-fast on webpage/PDF format changes, validate counts
**Scale/Scope**: ~50-100 colleges per region (Scotland, Wales, NI)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (CLI aggregator)
- Using framework directly? Yes (axios, cheerio, pdf-parse directly)
- Single data model? Yes (Organisation model)
- Avoiding patterns? Yes (direct parsing, no unnecessary abstraction)

**Architecture**:
- EVERY feature as library? Yes (colleges-parser service)
- Libraries listed: colleges-parser (fetch webpage, extract PDFs, parse college data)
- CLI per library: compile --source colleges-uk
- Library docs: llms.txt format planned? Yes

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual webpage/PDFs for contract tests)
- Integration tests for: new libraries, contract changes, shared schemas? Yes
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? Yes (existing Logger)
- Frontend logs → backend? N/A (CLI only)
- Error context sufficient? Yes (fail-fast with clear errors)

**Versioning**:
- Version number assigned? Inherits from main project
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (new feature)

## Project Structure

### Documentation (this feature)
```
specs/007-we-re-already/
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
│   └── college.ts       # College entity model
├── services/
│   ├── colleges-parser.ts  # Main parser service
│   └── mappers/
│       └── colleges-mapper.ts  # Maps to Organisation
├── cli/
│   └── orchestrator.ts  # Integration point
└── lib/
    └── pdf-utils.ts     # PDF parsing utilities

tests/
├── contract/
│   └── colleges-parser.contract.test.ts
├── integration/
│   └── colleges-aggregation.integration.test.ts
└── unit/
    └── colleges-mapper.unit.test.ts
```

**Structure Decision**: Option 1 (single project) - Existing TypeScript CLI aggregator

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - AoC webpage structure and selectors
   - PDF table format and parsing approach
   - College count display format on webpage

2. **Generate and dispatch research agents**:
   ```
   Task: "Research AoC webpage structure for PDF links and counts"
   Task: "Research PDF parsing with pdf-parse for table extraction"
   Task: "Find best practices for fail-fast HTML scraping validation"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: pdf-parse library for PDF parsing
   - Rationale: Mature, well-tested, handles table extraction
   - Alternatives considered: pdfjs-dist (too complex), pdf2json (less reliable)

**Output**: research.md with webpage structure and PDF parsing approach documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - College entity: name, region, source metadata
   - Validation rules: name required, region enum
   - No state transitions (static data)

2. **Generate API contracts** from functional requirements:
   - CollegesParser.aggregate() → CollegesResult
   - Contract test for webpage fetch
   - Contract test for PDF parsing
   - Contract test for count validation

3. **Generate contract tests** from contracts:
   - colleges-parser.contract.test.ts
   - Tests must fail (no implementation yet)
   - Mock webpage/PDFs for reproducible tests

4. **Extract test scenarios** from user stories:
   - Integration test: Full aggregation flow
   - Quickstart: Run aggregator, verify colleges added

5. **Update CLAUDE.md incrementally**:
   - Add colleges feature to current features
   - Add pdf-parse to dependencies
   - Update recent changes

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Contract test for webpage fetching [P]
- Contract test for PDF parsing [P]
- Contract test for count validation [P]
- Create College model
- Create CollegesParser service
- Create CollegesMapper
- Integration test for full flow
- Update orchestrator integration
- Update CLI options

**Ordering Strategy**:
- TDD order: All tests before implementation
- Dependency order: Models → Parser → Mapper → Orchestrator
- Mark [P] for parallel test creation

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations - section empty*

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