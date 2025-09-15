# Tasks: Northern Ireland Schools Data Integration

**Input**: Design documents from `/specs/008-ni-schools-you/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: TypeScript, axios, cheerio, xlsx dependencies
2. Load optional design documents:
   → data-model.md: NISchoolRaw entity → model task
   → contracts/: 2 contract files → 2 test tasks
   → research.md: Two-phase HTTP approach → parser tasks
3. Generate tasks by category:
   → Setup: Dependencies already in project
   → Tests: contract tests for parser and mapper
   → Core: parser service, mapper service
   → Integration: orchestrator integration
   → Polish: integration tests, documentation
4. Apply task rules:
   → Contract tests can run in parallel [P]
   → Parser before mapper (dependency)
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T017)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Project structure per plan.md: single CLI aggregator

## Phase 3.1: Setup
- [ ] T001 Verify existing dependencies (axios, cheerio, xlsx) in package.json
- [ ] T002 [P] Create directory structure: src/services/ and src/services/mappers/ if not exists

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T003 [P] Create contract test for NISchoolsParser in tests/contract/ni-schools-parser-contract.test.ts (copy from specs/008-ni-schools-you/contracts/ni-schools-parser-contract.ts)
- [ ] T004 [P] Create contract test for NISchoolsMapper in tests/contract/ni-schools-mapper-contract.test.ts (copy from specs/008-ni-schools-you/contracts/ni-schools-mapper-contract.ts)
- [ ] T005 [P] Create integration test for NI schools end-to-end flow in tests/integration/ni-schools.integration.test.ts
- [ ] T006 Run tests to ensure they fail: `pnpm test ni-schools` (should show import errors)

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T007 Create NISchoolRaw interface in src/services/ni-schools-parser.ts with fields: schoolName, schoolType, status, address fields, managementType, etc.
- [ ] T008 Implement NISchoolsParser class in src/services/ni-schools-parser.ts with methods: fetchPage(), extractTokens(), fetchExcelData(), parseExcel(), validateCount(), parse()
- [ ] T009 Implement two-phase HTTP request: Phase 1 GET for ViewState/EventValidation tokens, Phase 2 POST with form data for Excel export
- [ ] T010 [P] Create NISchoolsMapper class in src/services/mappers/ni-schools-mapper.ts with methods: map(school), mapMany(schools)
- [ ] T011 Implement school type mapping: Primary→Primary School, Post-Primary→Post-Primary School, Special→Special School, Nursery→Nursery School
- [ ] T012 Implement metadata preservation: managementType, principal, enrolment, ageRange, ward, constituency

## Phase 3.4: Integration
- [ ] T013 Add NISchoolsParser to orchestrator in src/services/orchestrator.ts - import parser and add to data sources array
- [ ] T014 Update orchestrator to handle NI schools: add try-catch for parser.parse(), map results with NISchoolsMapper, merge with other sources
- [ ] T015 Add NI schools count to logging output in orchestrator for monitoring

## Phase 3.5: Polish
- [ ] T016 [P] Add unit tests for token extraction and URL encoding in tests/unit/ni-schools-parser.unit.test.ts
- [ ] T017 [P] Update README.md to include Northern Ireland schools in data sources list
- [ ] T018 Run full integration test: `pnpm run compile` and verify ~1122 NI schools in output
- [ ] T019 Performance validation: Ensure NI schools processing completes within 30 seconds

## Dependencies
- Tests (T003-T006) must complete before implementation (T007-T012)
- T007 blocks T008-T009 (parser implementation)
- T008-T009 must complete before T013-T014 (orchestrator integration)
- T010-T012 can run parallel to T008-T009 (different files)
- All implementation before polish (T016-T019)

## Parallel Example
```bash
# Launch T003-T005 together (all test files):
Task: "Create contract test for NISchoolsParser in tests/contract/ni-schools-parser-contract.test.ts"
Task: "Create contract test for NISchoolsMapper in tests/contract/ni-schools-mapper-contract.test.ts"
Task: "Create integration test for NI schools in tests/integration/ni-schools.integration.test.ts"

# After parser is done, launch T010-T012 (mapper tasks):
Task: "Create NISchoolsMapper class in src/services/mappers/ni-schools-mapper.ts"
Task: "Implement school type mapping in ni-schools-mapper.ts"
Task: "Implement metadata preservation in ni-schools-mapper.ts"
```

## Notes
- ViewState/EventValidation tokens are required for ASP.NET WebForms
- Excel export uses exportType=2 for XLSX format
- Only "Open" schools should be included (status filtering)
- Count validation: expect ~1122 schools (±10% tolerance)
- Fail fast on: network errors, missing tokens, invalid Excel, count outside range

## Validation Checklist
- [x] All contracts have corresponding tests (T003-T004)
- [x] Entity (NISchoolRaw) has model task (T007)
- [x] All tests come before implementation (T003-T006 before T007-T012)
- [x] Parallel tasks truly independent (test files, mapper vs parser)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task