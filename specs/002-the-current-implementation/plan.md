# Implementation Plan: Fix Organization Count Discrepancies

**Branch**: `002-the-current-implementation` | **Date**: 2025-09-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-the-current-implementation/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detected existing TypeScript project with aggregator implementation
   → Structure Decision: Option 1 (single project)
3. Evaluate Constitution Check section below
   → No violations identified
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Research existing implementation issues
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → No new violations
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

## Summary
Fix the data aggregator to correctly fetch and parse 4028 organizations total: 611 from GOV.UK API, 3360 from ONS Excel "Organisation|Institutional Unit" tab, and 57 from ONS Excel "Non-Institutional Units" tab. Currently returning 0 organizations, indicating issues with data fetching/parsing logic.

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 18+  
**Primary Dependencies**: axios (HTTP client), xlsx (Excel parser), commander (CLI)  
**Storage**: JSON file output (dist/orgs.json)  
**Testing**: Jest with ts-jest  
**Target Platform**: Node.js CLI application  
**Project Type**: single - CLI aggregator tool  
**Performance Goals**: Process 100k+ records efficiently  
**Constraints**: Stream processing for memory efficiency  
**Scale/Scope**: 4028 organizations from 3 data sources

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (CLI aggregator)
- Using framework directly? Yes (axios, xlsx directly)
- Single data model? Yes (Organization interface)
- Avoiding patterns? Yes (no unnecessary abstractions)

**Architecture**:
- EVERY feature as library? Yes (services as modular components)
- Libraries listed: 
  - fetcher: HTTP data retrieval
  - parser: Excel/JSON parsing
  - mapper: Field mapping/transformation
  - deduplicator: Duplicate detection
  - writer: JSON output
- CLI per library: Single CLI with compile command
- Library docs: llms.txt format planned? Yes

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Will enforce
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (real API/Excel files)
- Integration tests for: new libraries, contract changes, shared schemas? Yes
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? Yes (console logs with counts)
- Frontend logs → backend? N/A (CLI only)
- Error context sufficient? Yes

**Versioning**:
- Version number assigned? Package.json versioning
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (initial implementation)

## Project Structure

### Documentation (this feature)
```
specs/002-the-current-implementation/
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
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: Option 1 - Single project (existing structure)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Why is aggregator returning 0 organizations?
   - What are the exact API endpoints and Excel file locations?
   - Are there parsing issues with the Excel tabs?

2. **Generate and dispatch research agents**:
   ```
   Task: "Research GOV.UK API endpoint and response format"
   Task: "Research ONS Excel file structure and tab names"
   Task: "Find existing implementation issues in fetcher/parser services"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all issues identified

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Organization entity with fields from all sources
   - Source metadata (origin, fetch timestamp)
   - Validation rules for required fields

2. **Generate API contracts** from functional requirements:
   - GOV.UK API contract (611 organizations)
   - ONS Excel contract (3360 + 57 organizations)
   - Output JSON schema

3. **Generate contract tests** from contracts:
   - Test for GOV.UK API response count
   - Test for ONS Excel tab parsing counts
   - Tests must fail initially

4. **Extract test scenarios** from user stories:
   - Verify 611 from GOV.UK
   - Verify 3360 from Institutional Units
   - Verify 57 from Non-Institutional Units
   - Verify 4028 total in output

5. **Update agent file incrementally**:
   - Update CLAUDE.md with fix context
   - Preserve existing project info
   - Add recent changes

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Fix GOV.UK API fetcher to retrieve 611 organizations
- Fix ONS Excel parser for Institutional Units tab (3360)
- Fix ONS Excel parser for Non-Institutional Units tab (57)
- Update aggregation logic to combine all sources
- Add count validation and reporting

**Ordering Strategy**:
- Contract tests first (verify expectations)
- Fix fetcher service
- Fix parser service
- Fix aggregation logic
- Integration tests

**Estimated Output**: 10-15 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations identified - all approaches follow constitutional principles*

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