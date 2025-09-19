# Implementation Plan: UK Government Organisation Data Sources

**Branch**: `013-unitary-authorities-england` | **Date**: 2025-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-unitary-authorities-england/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → No NEEDS CLARIFICATION markers found in spec
   → Detect Project Type: Single (CLI aggregator)
   → Set Structure Decision: Option 1 (existing project structure)
3. Evaluate Constitution Check section below
   → Following existing project patterns
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Research HTML scraping approaches for each source
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → Verify design follows existing patterns
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

## Summary
Add 12 new UK government organisation data sources to the existing aggregator, including English/Welsh/Scottish unitary authorities, health boards, transport partnerships, research councils, and other public bodies. Sources require HTML scraping with dynamic link detection and pagination handling.

## Technical Context
**Language/Version**: TypeScript 5.x
**Primary Dependencies**: axios (HTTP), cheerio (HTML parsing), csv-parse (CSV parsing)
**Storage**: JSON file output
**Testing**: Jest with ts-jest
**Target Platform**: Node.js 18+ CLI application
**Project Type**: single - CLI aggregator
**Performance Goals**: No specific constraints (per spec FR-010)
**Constraints**: Use existing retry mechanism with exponential backoff
**Scale/Scope**: 12 new data sources, estimated 3000+ organisations total

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (existing CLI aggregator)
- Using framework directly? Yes (axios, cheerio directly)
- Single data model? Yes (Organisation interface)
- Avoiding patterns? Yes (direct service implementations)

**Architecture**:
- EVERY feature as library? Yes (services pattern)
- Libraries listed:
  - Fetchers: One per data source (12 new)
  - Mappers: Shared mapper for similar types
  - Parser: CSV and HTML parsing utilities
- CLI per library: Main CLI orchestrates all
- Library docs: Following existing pattern

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual HTTP calls in contract tests)
- Integration tests for: new libraries, contract changes, shared schemas? Yes
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? Following existing pattern
- Frontend logs → backend? N/A (CLI only)
- Error context sufficient? Yes (with source identification)

**Versioning**:
- Version number assigned? Following existing versioning
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (additive changes only)

## Project Structure

### Documentation (this feature)
```
specs/013-unitary-authorities-england/
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
│   └── organisation.ts      # Extend with new types
├── services/
│   ├── fetchers/           # 12 new fetcher services
│   ├── parsers/            # CSV/HTML parsing utilities
│   └── mappers/            # Type-specific mappers
├── cli/
│   └── orchestrator.ts     # Update to include new sources
└── lib/
    └── writer.ts           # Existing JSON writer

tests/
├── contract/              # API contract tests for each source
├── integration/           # End-to-end pipeline tests
└── unit/                  # Parser and mapper unit tests
```

**Structure Decision**: Option 1 - Single project (existing structure maintained)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - HTML structure for each of 12 sources
   - Dynamic link extraction for ONS CSV
   - Pagination handling for Healthwatch
   - Selector patterns for each HTML source

2. **Generate and dispatch research agents**:
   ```
   Task: "Research ONS dynamic CSV link extraction pattern"
   Task: "Research Healthwatch pagination structure"
   Task: "Research Wikipedia table parsing for Districts"
   Task: "Research MyGov.scot organisations page structure"
   Task: "Research Law.gov.wales HTML structure"
   Task: "Research NI government HTML patterns"
   Task: "Research NHS services locator structure"
   Task: "Research UKRI councils page format"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: Cheerio selectors for each source
   - Rationale: Consistent with existing scrapers
   - Alternatives considered: Puppeteer (overkill for static HTML)

**Output**: research.md with scraping strategies for all 12 sources

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Extend Organisation with new subtypes:
     - UnitaryAuthority (England/Wales)
     - DistrictCouncil (England)
     - HealthBoard (Scotland)
     - IntegratedCareBoard (England)
     - LocalHealthwatch (England)
     - RegionalTransportPartnership (Scotland)
     - ResearchCouncil (UK)
     - NationalParkAuthority (England)
     - TrustPort (NI)
     - GovernmentDepartment (NI)

2. **Generate API contracts** from functional requirements:
   - 12 fetcher contracts (URL → HTML/CSV response)
   - Parser contracts (HTML/CSV → structured data)
   - Mapper contracts (raw data → Organisation)

3. **Generate contract tests** from contracts:
   - One test file per fetcher (12 files)
   - Tests verify URL accessibility
   - Tests verify response structure
   - Tests must fail initially

4. **Extract test scenarios** from user stories:
   - Aggregate all 12 sources successfully
   - Handle dynamic CSV link extraction
   - Process paginated results completely
   - Maintain regional classification

5. **Update CLAUDE.md incrementally**:
   - Add new feature branch info
   - Add 12 new data sources to current feature
   - Keep under 150 lines

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md update

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- 12 contract test tasks [P] - one per source
  - Each verifies URL accessibility and response structure
  - Tests must fail initially (RED phase)
- 12 fetcher implementation tasks
  - Implement HTML/CSV fetching and parsing
  - Make contract tests pass (GREEN phase)
- 6 mapper implementation tasks (grouped by type):
  - UnitaryAuthorityMapper
  - DistrictCouncilMapper
  - HealthOrganisationMapper
  - TransportPartnershipMapper
  - ResearchCouncilMapper
  - GovernmentDepartmentMapper
- 12 integration test tasks
  - End-to-end test for each source
  - Verify fetch → parse → map pipeline
- 1 orchestrator update task
  - Add all new sources to main aggregator
- 1 comprehensive E2E test
  - Verify all sources aggregate successfully

**Ordering Strategy**:
- Contract tests first (TDD - RED phase)
- Fetchers next (make tests pass - GREEN phase)
- Mappers after fetchers (required for integration)
- Integration tests after components
- Orchestrator update and E2E test last

**Parallel Execution Opportunities**:
- All 12 contract tests can run in parallel [P]
- Fetcher implementations can be developed in parallel
- Mapper implementations can be developed in parallel
- Integration tests can run in parallel after dependencies ready

**Estimated Output**: 44 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD)
**Phase 5**: Validation (run tests, execute quickstart.md)

## Complexity Tracking
*No violations - following existing patterns*

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
*Based on existing project patterns and Constitution*