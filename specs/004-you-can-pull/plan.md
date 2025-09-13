# Implementation Plan: NHS Trusts and Local Authorities Data Integration

**Branch**: `004-you-can-pull` | **Date**: 2025-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-you-can-pull/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → No NEEDS CLARIFICATION markers found in spec
   → Project Type: Single (CLI aggregator tool)
   → Structure Decision: Option 1 (single project)
3. Evaluate Constitution Check section below
   → All checks passing
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Research HTML scraping approaches
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → All checks still passing
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

## Summary
Add NHS Trusts and Local Authorities as new data sources to the UK Public Sector Organisation Aggregator. The system will scrape HTML pages from NHS Provider Directory and DEFRA UK-AIR to extract organisation data, map it to the unified schema, and include it in the aggregated JSON output.

## Technical Context
**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: axios (HTTP client), node-html-parser or cheerio (HTML parsing)  
**Storage**: JSON file output  
**Testing**: Jest with ts-jest  
**Target Platform**: Node.js 18+ CLI application  
**Project Type**: single - CLI aggregator tool  
**Performance Goals**: Process all data sources within 60 seconds  
**Constraints**: Must fail completely on source unavailability or format changes  
**Scale/Scope**: ~600 NHS Trusts, ~400 Local Authorities

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (single CLI aggregator)
- Using framework directly? Yes (axios, HTML parser directly)
- Single data model? Yes (Organisation interface)
- Avoiding patterns? Yes (direct service implementation)

**Architecture**:
- EVERY feature as library? Yes (new parsers as services)
- Libraries listed: 
  - nhs-parser: Extract NHS Trusts from HTML
  - local-authority-parser: Extract Local Authorities from HTML
- CLI per library: Exposed via main CLI with --source flag
- Library docs: Will follow existing pattern

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Will enforce
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual HTTP requests in integration tests)
- Integration tests for: new libraries, contract changes, shared schemas? Yes
- FORBIDDEN: Implementation before test, skipping RED phase - Understood

**Observability**:
- Structured logging included? Yes (existing logger)
- Frontend logs → backend? N/A (CLI only)
- Error context sufficient? Yes

**Versioning**:
- Version number assigned? Will increment existing
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (additive change)

## Project Structure

### Documentation (this feature)
```
specs/004-you-can-pull/
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
│   ├── nhs-parser.ts    # NEW
│   └── local-authority-parser.ts  # NEW
├── cli/
└── lib/

tests/
├── contract/
│   ├── nhs-parser.contract.test.ts  # NEW
│   └── local-authority-parser.contract.test.ts  # NEW
├── integration/
└── unit/
```

**Structure Decision**: Option 1 - Single project (existing CLI aggregator structure)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - HTML parsing library selection (cheerio vs node-html-parser)
   - Robust HTML scraping patterns for NHS Provider Directory
   - Robust HTML scraping patterns for DEFRA UK-AIR Local Authorities

2. **Generate and dispatch research agents**:
   ```
   Task: "Research HTML parsing libraries for TypeScript - cheerio vs node-html-parser"
   Task: "Find best practices for HTML scraping with error detection"
   Task: "Research NHS organisation codes and identifiers"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: HTML parsing approach
   - Rationale: Library choice and scraping strategy
   - Alternatives considered: Other parsing options

**Output**: research.md with HTML scraping approach defined

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - NHSTrust: name, code, type (Trust/Foundation)
   - LocalAuthority: name, url, type
   - Mapping to existing Organisation model

2. **Generate API contracts** from functional requirements:
   - NHS Parser contract: Input (URL) → Output (NHSTrust[])
   - Local Authority Parser contract: Input (URL) → Output (LocalAuthority[])
   - Output schemas to `/contracts/`

3. **Generate contract tests** from contracts:
   - tests/contract/nhs-parser.contract.test.ts
   - tests/contract/local-authority-parser.contract.test.ts
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Fetch and parse NHS Trusts successfully
   - Fetch and parse Local Authorities successfully
   - Handle source unavailability with error
   - Deduplicate with existing data

5. **Update CLAUDE.md incrementally**:
   - Add HTML parsing library to tech stack
   - Update current feature section
   - Keep under 150 lines

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Generate tasks from Phase 1 design docs (contracts, data-model, quickstart)
- Contract tests for NHS parser [P]
- Contract tests for Local Authority parser [P]
- Integration tests for data fetching
- Implementation of parsers
- Update aggregator to include new sources

**Ordering Strategy**:
- TDD order: Tests before implementation
- Contract tests first (must fail initially)
- Parser implementation to make tests pass
- Integration with main aggregator
- Full system validation

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md

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