# Implementation Plan: Emergency Services and Devolved Administration Data Sources

**Branch**: `006-you-can-find` | **Date**: 2025-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-you-can-find/spec.md`

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
   → Research police.uk website structure
   → Research NFCC fire services page structure
   → Research devolution guidance page content
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → Verify no new violations
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

## Summary
Aggregate UK emergency services (police forces and fire services) and additional devolved administration entities from government websites using HTML scraping. The system will fetch and parse three main sources: UK police forces from police.uk, fire services from NFCC, and devolved bodies from gov.uk guidance. All data will be extracted using cheerio for HTML parsing, deduplicated against existing records, and integrated into the unified organisation format.

## Technical Context
**Language/Version**: TypeScript 5.x (from existing codebase)  
**Primary Dependencies**: axios (HTTP client), cheerio (HTML parsing)  
**Storage**: JSON files (consistent with existing aggregator pattern)  
**Testing**: Jest with ts-jest (80% coverage requirement from CLAUDE.md)  
**Target Platform**: Node.js 18+ with tsx runtime  
**Project Type**: single - CLI aggregator tool  
**Performance Goals**: Complete aggregation within 5 minutes for all sources  
**Constraints**: Handle HTML structure changes gracefully with fail-fast approach  
**Scale/Scope**: ~45 police forces, ~50 fire services, ~20 additional devolved entities

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (single CLI aggregator)
- Using framework directly? Yes (axios for HTTP, cheerio for HTML parsing)
- Single data model? Yes (Organisation entity with emergency service types)
- Avoiding patterns? Yes (direct implementation, no unnecessary abstractions)

**Architecture**:
- EVERY feature as library? Yes (police-parser, fire-parser, devolved-parser services)
- Libraries listed: 
  - police-parser: Parse police forces from HTML
  - fire-parser: Parse fire services from HTML
  - devolved-parser: Parse additional devolved entities
- CLI per library: Integrated into main compile command
- Library docs: Following existing parser pattern

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual HTML fetching)
- Integration tests for: new parsers, HTML parsing, deduplication
- FORBIDDEN: Implementation before test ✓

**Observability**:
- Structured logging included? Yes (using existing logger)
- Frontend logs → backend? N/A (CLI tool)
- Error context sufficient? Yes (source attribution, parsing errors)

**Versioning**:
- Version number assigned? Using existing versioning
- BUILD increments on every change? Yes
- Breaking changes handled? N/A (internal parsers)

## Project Structure

### Documentation (this feature)
```
specs/006-you-can-find/
├── plan.md              # This file
├── research.md          # HTML structure analysis
├── data-model.md        # EmergencyService entity extensions
├── quickstart.md        # Test scenarios
├── contracts/           # Parser contracts
│   ├── police-parser.contract.ts
│   ├── fire-parser.contract.ts
│   └── devolved-parser.contract.ts
└── tasks.md             # Phase 2 output (NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (SELECTED)
src/
├── models/
│   └── emergency-services.ts    # New entity types
├── services/
│   ├── police-parser.ts         # Police forces HTML parser
│   ├── fire-parser.ts           # Fire services HTML parser
│   └── devolved-parser.ts       # Additional devolved entities parser
├── services/mappers/
│   ├── police-mapper.ts         # Police to Organisation mapper
│   ├── fire-mapper.ts           # Fire to Organisation mapper
│   └── devolved-mapper.ts       # Devolved to Organisation mapper
└── cli/
    └── orchestrator.ts          # Updated to include new parsers

tests/
├── contract/
│   ├── police-parser.contract.test.ts
│   ├── fire-parser.contract.test.ts
│   └── devolved-parser.contract.test.ts
├── integration/
│   └── emergency-services.integration.test.ts
└── unit/
    └── emergency-mappers.unit.test.ts
```

**Structure Decision**: Option 1 - Single project (consistent with existing aggregator)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - Police.uk HTML structure and data format
   - NFCC fire services page structure
   - Devolution guidance page content structure
   - Categorization of Crown Dependencies police forces

2. **Generate and dispatch research agents**:
   ```
   Task: "Analyze police.uk UK forces page HTML structure"
   Task: "Analyze NFCC fire services contacts page"
   Task: "Analyze gov.uk devolution guidance structure"
   Task: "Research emergency service classification standards"
   ```

3. **Consolidate findings** in `research.md`:
   - HTML selectors for each source
   - Data attributes available
   - Edge cases and variations
   - Deduplication strategy

**Output**: research.md with HTML parsing strategies

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - EmergencyService base type
   - PoliceForce entity with jurisdiction
   - FireService entity with region
   - DevolvedBody entity with governmental role

2. **Generate parser contracts** from requirements:
   - police-parser.contract.ts: UK and non-UK forces
   - fire-parser.contract.ts: Fire services with regions
   - devolved-parser.contract.ts: Bodies and departments

3. **Generate contract tests**:
   - Test HTML parsing for each source
   - Test data extraction and transformation
   - Test error handling for structure changes

4. **Extract test scenarios** → `quickstart.md`:
   - Successful aggregation of all sources
   - Handling missing or changed HTML
   - Deduplication verification
   - Classification accuracy

5. **Update CLAUDE.md incrementally**:
   - Add emergency services parsers
   - Update data source count
   - Add new organisation types

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Generate tasks from contracts and data model
- Each parser contract → contract test task [P]
- Each entity type → model creation task [P]
- Each parser → implementation task
- Integration test for combined aggregation
- Update orchestrator to include new parsers

**Ordering Strategy**:
- Contract tests first (TDD)
- Models before parsers
- Parsers before mappers
- All parsers complete before orchestrator update
- Mark [P] for parallel parser development

**Estimated Output**: 20-25 numbered tasks including tests and implementation

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks following TDD)  
**Phase 5**: Validation (run all tests, verify aggregation)

## Complexity Tracking
*No violations - following existing patterns*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete
- [x] Phase 1: Design complete  
- [x] Phase 2: Task planning complete (approach defined)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on existing aggregator patterns and TDD principles*