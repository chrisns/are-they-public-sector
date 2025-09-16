# Implementation Plan: Groundwork Trusts and NHS Charities Data Integration

**Branch**: `010-you-can-discover` | **Date**: 2025-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-you-can-discover/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Loaded and analyzed spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ No NEEDS CLARIFICATION markers found in spec
   ✓ Detect Project Type: Single (data aggregation service)
   ✓ Set Structure Decision: Option 1 (single project)
3. Evaluate Constitution Check section below
   ✓ Simplicity checks pass
   ✓ Architecture follows library pattern
   ✓ TDD approach planned
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   ✓ Research completed on data sources
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   ✓ Data model defined
   ✓ Contracts created
   ✓ Quickstart generated
6. Re-evaluate Constitution Check section
   ✓ No new violations
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Task generation approach described
8. STOP - Ready for /tasks command
```

## Summary
Add Groundwork Trusts and NHS Charities organisations to the UK public sector dataset by scraping their respective websites and extracting organisation data. Groundwork Trusts data comes from HTML scraping, while NHS Charities data requires discovering an API endpoint from the webpage and fetching JSON data.

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 18+
**Primary Dependencies**: axios (HTTP requests), cheerio (HTML parsing), existing parser framework
**Storage**: JSON file output (dist/orgs.json)
**Testing**: Jest with ts-jest (contract → integration → unit)
**Target Platform**: Linux/macOS CLI tool
**Project Type**: single - CLI data aggregation tool
**Performance Goals**: Complete aggregation within 60 seconds
**Constraints**: Retry on failure, fail-fast if websites unavailable after retries
**Scale/Scope**: ~30 Groundwork Trusts, ~240 NHS Charities

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (single CLI aggregator)
- Using framework directly? Yes (axios, cheerio directly)
- Single data model? Yes (Organisation model)
- Avoiding patterns? Yes (simple parser services)

**Architecture**:
- EVERY feature as library? Yes (separate parser services)
- Libraries listed:
  - groundwork-parser: Extract Groundwork Trusts from website
  - nhs-charities-parser: Extract NHS Charities from API
  - Organisation mapper: Map to common Organisation model
- CLI per library: Each parser has parse() method callable from CLI
- Library docs: Following existing pattern in codebase

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual HTTP requests in integration tests)
- Integration tests for: new parsers, data extraction, mapping
- FORBIDDEN: Implementation before test ✓ Understood

**Observability**:
- Structured logging included? Yes (console.log for progress)
- Frontend logs → backend? N/A (CLI only)
- Error context sufficient? Yes (detailed error messages)

**Versioning**:
- Version number assigned? Follows existing pattern
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (new feature)

## Project Structure

### Documentation (this feature)
```
specs/010-you-can-discover/
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
│   └── groundwork-trust.ts    # New entity types
│   └── nhs-charity.ts         # New entity types
├── services/
│   ├── groundwork-parser.ts   # HTML scraping service
│   ├── nhs-charities-parser.ts # API discovery & fetch
│   └── mappers/
│       ├── groundwork-mapper.ts
│       └── nhs-charities-mapper.ts
├── cli/
│   └── orchestrator.ts        # Updated to include new sources
└── lib/
    └── writer.ts              # Existing JSON writer

tests/
├── contract/
│   ├── groundwork-parser.contract.test.ts
│   └── nhs-charities-parser.contract.test.ts
├── integration/
│   ├── groundwork.integration.test.ts
│   └── nhs-charities.integration.test.ts
└── unit/
    └── mappers.test.ts
```

**Structure Decision**: Option 1 (single project) - matches existing codebase pattern

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Research Groundwork Trusts website structure
   - Research NHS Charities API discovery method
   - Investigate data formats available

2. **Generate and dispatch research agents**:
   ```
   Task: "Analyze Groundwork Trusts webpage structure"
   Task: "Discover NHS Charities API endpoint from HTML"
   Task: "Examine JSON response format from API"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: HTML scraping for Groundwork, API for NHS Charities
   - Rationale: Groundwork has no API, NHS has discoverable API
   - Alternatives considered: Static fallback data (rejected - want live data)

**Output**: research.md with data source analysis complete

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - GroundworkTrust: name, location, address, website
   - NHSCharity: name, location, address, website, region
   - Both map to Organisation with type 'Central Government'

2. **Generate API contracts** from functional requirements:
   - groundwork-parser-contract.ts: parse() → GroundworkTrust[]
   - nhs-charities-parser-contract.ts: parse() → NHSCharity[]
   - Output test contracts to `/contracts/`

3. **Generate contract tests** from contracts:
   - Test HTML parsing for Groundwork
   - Test API discovery and JSON parsing for NHS
   - Tests must fail initially (TDD)

4. **Extract test scenarios** from user stories:
   - Fetch all Groundwork Trusts successfully
   - Discover and fetch NHS Charities API
   - Handle website unavailable scenarios
   - Map to Organisation model correctly

5. **Update CLAUDE.md incrementally**:
   - Add new parsers to project structure
   - Note HTML scraping with cheerio
   - Note API discovery pattern

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Generate contract tests for both parsers [P]
- Create data model types [P]
- Create parser services with TDD
- Create mappers to Organisation model
- Integrate into orchestrator
- Add CLI commands

**Ordering Strategy**:
- TDD order: Contract tests first
- Then models, then implementation
- Finally integration into orchestrator
- Mark [P] for parallel tasks

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD)
**Phase 5**: Validation (run tests, execute quickstart.md)

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
*Based on existing codebase patterns - See CLAUDE.md*