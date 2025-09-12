# Tasks: UK Public Sector Organisation Aggregator

**Input**: Design documents from `/specs/001-aggregator-of-data/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths shown below for single TypeScript CLI project

## Phase 3.1: Setup
- [x] T001 Create project structure with src/, tests/, dist/ directories per implementation plan
- [x] T002 Initialize TypeScript project with package.json, tsconfig.json, and minimal dependencies (axios, xlsx, commander)
- [x] T003 [P] Configure Jest with ts-jest for 80% coverage requirement in jest.config.js
- [x] T004 [P] Create pnpm scripts in package.json (compile, test, coverage, lint, build)
- [x] T005 [P] Set up TypeScript configuration for Node.js target with strict mode

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [x] T006 [P] Contract test for GOV.UK API response in tests/contract/govuk-api.test.ts
- [x] T007 [P] Contract test for ONS Excel parsing in tests/contract/ons-excel.test.ts  
- [x] T008 [P] Contract test for JSON output structure in tests/contract/output-json.test.ts

### Integration Tests
- [x] T009 [P] Integration test for complete aggregation flow in tests/integration/aggregation.test.ts
- [x] T010 [P] Integration test for data deduplication in tests/integration/deduplication.test.ts
- [x] T011 [P] Integration test for field mapping in tests/integration/mapping.test.ts
- [x] T012 [P] Integration test for error handling in tests/integration/error-handling.test.ts

### Mock Data Creation
- [x] T013 [P] Create mock GOV.UK API response in tests/mocks/data/govuk-response.json
- [x] T014 [P] Create mock ONS Excel files in tests/mocks/data/ons-institutional.xlsx and ons-non-institutional.xlsx
- [x] T015 [P] Create expected output JSON in tests/mocks/data/expected-output.json

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models
- [x] T016 [P] Organisation model and related interfaces in src/models/organisation.ts
- [x] T017 [P] Source-specific models (GovUKOrganisation, ONSInstitutionalUnit, ONSNonInstitutionalUnit) in src/models/sources.ts
- [x] T018 [P] Processing models (AuditRecord, DataConflict, ProcessingResult) in src/models/processing.ts

### Service Modules
- [x] T019 [P] HTTP fetcher service for GOV.UK API and ONS HTML in src/services/fetcher.ts
- [x] T020 [P] Excel and JSON parser service in src/services/parser.ts
- [x] T021 [P] Data mapper service for field transformations in src/services/mapper.ts
- [x] T022 [P] Deduplication service for organisation matching in src/services/deduplicator.ts
- [x] T023 [P] JSON writer utility in src/lib/writer.ts

### CLI Implementation
- [x] T024 Main CLI entry point with commander setup in src/cli/index.ts
- [x] T025 Orchestration logic to coordinate all services in src/cli/orchestrator.ts
- [x] T026 Error handling and logging configuration in src/cli/logger.ts

## Phase 3.4: Integration

### Service Integration
- [x] T027 Connect fetcher to real GOV.UK API endpoint
- [x] T028 Implement ONS HTML scraping to find Excel file link
- [x] T029 Wire up parser to handle Excel tabs dynamically
- [x] T030 Configure mapper with field mapping rules from contracts
- [x] T031 Set up deduplicator with similarity thresholds

### CLI Features
- [x] T032 Add --cache flag for development mode caching
- [x] T033 Add --debug flag for verbose logging
- [x] T034 Add --timeout option for network requests
- [x] T035 Implement progress indicators for long-running operations

## Phase 3.5: Polish

### Unit Tests
- [x] T036 [P] Unit tests for fetcher service in tests/unit/fetcher.test.ts
- [x] T037 [P] Unit tests for parser service in tests/unit/parser.test.ts
- [x] T038 [P] Unit tests for mapper service in tests/unit/mapper.test.ts
- [x] T039 [P] Unit tests for deduplicator service in tests/unit/deduplicator.test.ts
- [x] T040 [P] Unit tests for writer utility in tests/unit/writer.test.ts

### Performance & Documentation
- [x] T041 Performance test for handling 100k+ records
- [x] T042 Verify 80% test coverage target is met
- [x] T043 [P] Add JSDoc comments to all public interfaces
- [x] T044 [P] Update README.md with usage instructions
- [x] T045 Run complete end-to-end test with real data

## Dependencies
- Setup (T001-T005) must complete first
- Tests (T006-T015) before implementation (T016-T035)
- Models (T016-T018) before services (T019-T023)
- Services before CLI (T024-T026)
- Core implementation before integration (T027-T035)
- Everything before polish (T036-T045)

## Parallel Execution Examples

### Launch contract tests together (T006-T008):
```
Task: "Contract test for GOV.UK API response in tests/contract/govuk-api.test.ts"
Task: "Contract test for ONS Excel parsing in tests/contract/ons-excel.test.ts"
Task: "Contract test for JSON output structure in tests/contract/output-json.test.ts"
```

### Launch integration tests together (T009-T012):
```
Task: "Integration test for complete aggregation flow in tests/integration/aggregation.test.ts"
Task: "Integration test for data deduplication in tests/integration/deduplication.test.ts"
Task: "Integration test for field mapping in tests/integration/mapping.test.ts"
Task: "Integration test for error handling in tests/integration/error-handling.test.ts"
```

### Launch service implementations together (T019-T023):
```
Task: "HTTP fetcher service for GOV.UK API and ONS HTML in src/services/fetcher.ts"
Task: "Excel and JSON parser service in src/services/parser.ts"
Task: "Data mapper service for field transformations in src/services/mapper.ts"
Task: "Deduplication service for organisation matching in src/services/deduplicator.ts"
Task: "JSON writer utility in src/lib/writer.ts"
```

## Notes
- [P] tasks work on different files with no dependencies
- Verify all tests fail (RED phase) before implementing
- Commit after each task completion
- Use `pnpm run compile` to test the full aggregation
- Use `pnpm run coverage` to verify 80% coverage requirement

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - input-contracts.json → GOV.UK API test, ONS Excel test
   - output-contract.json → JSON output structure test
   
2. **From Data Model**:
   - Organisation entity → organisation.ts model
   - Source models → sources.ts
   - Processing models → processing.ts
   
3. **From User Stories**:
   - Aggregation flow → integration test
   - Deduplication → integration test
   - Error handling → integration test

4. **Ordering**:
   - Setup → Tests → Models → Services → CLI → Integration → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T006-T008)
- [x] All entities have model tasks (T016-T018)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] 80% coverage requirement documented (T042)
- [x] TDD enforced (tests must fail first)