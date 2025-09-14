# Tasks: Emergency Services and Devolved Administration Data Sources

**Input**: Design documents from `/specs/006-you-can-find/`
**Prerequisites**: plan.md (complete), research.md (complete), data-model.md (complete), contracts/ (3 files)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, axios, cheerio
   → Structure: Single project (Option 1)
2. Load optional design documents:
   → data-model.md: 4 entities (EmergencyService, PoliceForce, FireService, DevolvedBody)
   → contracts/: 3 parser contracts
   → research.md: HTML parsing strategies
3. Generate tasks by category:
   → Setup: Add OrganisationType enum value
   → Tests: 3 contract tests, 1 integration test
   → Core: 3 models, 3 parsers, 3 mappers
   → Integration: Orchestrator update
   → Polish: Unit tests, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T025)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths shown below for single project structure from plan.md

## Phase 3.1: Setup
- [x] T001 Add EMERGENCY_SERVICE to OrganisationType enum in src/models/organisation.ts
- [x] T002 Add POLICE_UK, NFCC, GOV_UK_GUIDANCE to DataSourceType enum in src/models/organisation.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T003 [P] Contract test for police-parser in tests/contract/police-parser.contract.test.ts
- [x] T004 [P] Contract test for fire-parser in tests/contract/fire-parser.contract.test.ts  
- [x] T005 [P] Contract test for devolved-parser in tests/contract/devolved-parser.contract.test.ts
- [x] T006 [P] Integration test for emergency services aggregation in tests/integration/emergency-services.integration.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Models
- [x] T007 [P] Create EmergencyService interfaces in src/models/emergency-services.ts
- [x] T008 Extend emergency-services.ts with PoliceForce interface
- [x] T009 Extend emergency-services.ts with FireService interface
- [x] T010 Extend emergency-services.ts with DevolvedBody interface

### Parsers
- [x] T011 [P] Create PoliceParser class in src/services/police-parser.ts
- [x] T012 [P] Create FireParser class in src/services/fire-parser.ts
- [x] T013 [P] Create DevolvedParser class in src/services/devolved-parser.ts

### Parser Implementation
- [x] T014 Implement police-parser fetchAll() and parseHTML() methods
- [x] T015 Implement fire-parser fetchAll() and parseHTML() methods
- [x] T016 Implement devolved-parser fetchAll(), parseHTML() and deduplication

### Mappers
- [x] T017 [P] Create PoliceMapper in src/services/mappers/police-mapper.ts
- [x] T018 [P] Create FireMapper in src/services/mappers/fire-mapper.ts
- [x] T019 [P] Create DevolvedMapper in src/services/mappers/devolved-mapper.ts

## Phase 3.4: Integration
- [x] T020 Add police parser to orchestrator.ts aggregateSources()
- [x] T021 Add fire parser to orchestrator.ts aggregateSources()
- [x] T022 Add devolved parser to orchestrator.ts aggregateSources()
- [x] T023 Update orchestrator.ts CLI options to support --source police/fire/devolved-extra

## Phase 3.5: Polish
- [x] T024 [P] Unit tests for emergency service mappers in tests/unit/emergency-mappers.unit.test.ts
- [x] T025 Update README.md with emergency services data sources

## Dependencies
- T001-T002 must complete before T003-T006 (enum values needed)
- Tests (T003-T006) before implementation (T007-T019)
- T007 blocks T008-T010 (same file)
- T011-T013 can run in parallel (different files)
- T014-T016 depend on T011-T013 respectively
- T017-T019 depend on T014-T016 respectively
- T020-T023 sequential (same file - orchestrator.ts)
- T024-T025 can run in parallel after all implementation

## Parallel Execution Examples

### Test Creation (after T001-T002):
```bash
# Launch T003-T006 together:
Task: "Contract test for police-parser in tests/contract/police-parser.contract.test.ts"
Task: "Contract test for fire-parser in tests/contract/fire-parser.contract.test.ts"
Task: "Contract test for devolved-parser in tests/contract/devolved-parser.contract.test.ts"
Task: "Integration test for emergency services in tests/integration/emergency-services.integration.test.ts"
```

### Parser Creation:
```bash
# Launch T011-T013 together:
Task: "Create PoliceParser class in src/services/police-parser.ts"
Task: "Create FireParser class in src/services/fire-parser.ts"
Task: "Create DevolvedParser class in src/services/devolved-parser.ts"
```

### Mapper Creation:
```bash
# Launch T017-T019 together:
Task: "Create PoliceMapper in src/services/mappers/police-mapper.ts"
Task: "Create FireMapper in src/services/mappers/fire-mapper.ts"
Task: "Create DevolvedMapper in src/services/mappers/devolved-mapper.ts"
```

## Notes
- Each parser follows existing pattern (nhs-parser.ts, local-authority-parser.ts)
- Use cheerio for all HTML parsing
- Fail-fast on HTML structure changes
- Minimum record validation: police >= 40, fire >= 45, devolved >= 10
- Deduplication required for devolved bodies against existing data

## Validation Checklist
*GATE: Checked before task execution*

- [x] All contracts have corresponding tests (3 contracts → 3 tests)
- [x] All entities have model tasks (4 entities → T007-T010)
- [x] All tests come before implementation (T003-T006 before T007-T023)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---
*Tasks ready for execution - follow TDD strictly*