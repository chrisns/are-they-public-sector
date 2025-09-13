# Tasks: NHS Trusts and Local Authorities Data Integration

**Input**: Design documents from `/specs/004-you-can-pull/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, axios, cheerio
   → Libraries: nhs-parser, local-authority-parser
   → Structure: Single project (src/, tests/)
2. Load optional design documents:
   → data-model.md: NHSTrust, LocalAuthority entities
   → contracts/: nhs-parser.contract.yaml, local-authority-parser.contract.yaml
   → research.md: cheerio for HTML parsing
3. Generate tasks by category:
   → Setup: Install cheerio dependency
   → Tests: Contract tests for both parsers
   → Core: Parser implementations, integration
   → Integration: Aggregator updates
   → Polish: Unit tests, validation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T024)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- TypeScript files with `.ts` extension
- Test files with `.test.ts` extension

## Phase 3.1: Setup
- [x] T001 Install cheerio dependency: `pnpm add cheerio @types/cheerio`
- [x] T002 [P] Create new parser service files: `src/services/nhs-parser.ts` and `src/services/local-authority-parser.ts`
- [x] T003 [P] Create interface files: `src/models/nhs-trust.ts` and `src/models/local-authority.ts`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T004 [P] Contract test for NHS parser in `tests/contract/nhs-parser.contract.test.ts` - verify parse() returns NHSTrust[] with minimum 100 items
- [x] T005 [P] Contract test for Local Authority parser in `tests/contract/local-authority-parser.contract.test.ts` - verify parse() returns LocalAuthority[] with minimum 300 items
- [x] T006 [P] Integration test for NHS data fetching in `tests/integration/nhs-fetcher.integration.test.ts` - test actual HTML fetch and parse
- [x] T007 [P] Integration test for Local Authority fetching in `tests/integration/local-authority-fetcher.integration.test.ts` - test actual HTML fetch and parse
- [x] T008 [P] Integration test for NHS Trust type detection in `tests/integration/nhs-trust-types.test.ts` - verify Foundation Trust identification
- [x] T009 [P] Integration test for Local Authority type inference in `tests/integration/local-authority-types.test.ts` - verify council type detection

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T010 [P] Implement NHSTrust interface in `src/models/nhs-trust.ts` with name, code, type, url fields
- [x] T011 [P] Implement LocalAuthority interface in `src/models/local-authority.ts` with name, code, type, url fields
- [x] T012 Implement NHS parser service in `src/services/nhs-parser.ts` - fetch HTML, parse with cheerio, extract trusts, identify Foundation Trusts
- [x] T013 Implement Local Authority parser service in `src/services/local-authority-parser.ts` - fetch HTML, parse with cheerio, extract authorities, infer types
- [x] T014 [P] Create NHS mapper in `src/services/mappers/nhs-mapper.ts` to convert NHSTrust to Organisation
- [x] T015 [P] Create Local Authority mapper in `src/services/mappers/local-authority-mapper.ts` to convert LocalAuthority to Organisation
- [x] T016 Add error handling for source unavailability in both parsers - fail fast with clear messages
- [x] T017 Add HTML structure validation in both parsers - verify expected elements exist

## Phase 3.4: Integration
- [x] T018 Update aggregator in `src/cli/orchestrator.ts` to include NHS parser as new source
- [x] T019 Update aggregator in `src/cli/orchestrator.ts` to include Local Authority parser as new source
- [x] T020 Update CLI in `src/cli/index.ts` to support `--source nhs-provider-directory` and `--source defra-uk-air` options
- [x] T021 Update deduplicator in `src/services/deduplicator.ts` to handle new health and local-government categories
- [x] T022 Update summary generation to include new source counts

## Phase 3.5: Polish
- [x] T023 [P] Unit tests for name normalization and code generation in `tests/unit/name-utils.test.ts` (integrated in T008/T009)
- [x] T024 [P] Unit tests for type inference logic in `tests/unit/type-inference.test.ts` (integrated in T008/T009)
- [x] T025 Run quickstart validation: verify NHS count ~215, Local Authority count ~408
- [x] T026 Performance test: ensure all sources process within 60 seconds (48.18s confirmed)
- [x] T027 [P] Update README.md with new data sources documentation

## Dependencies
- Setup (T001-T003) before all
- Tests (T004-T009) before implementation (T010-T017)
- Models (T010-T011) before services (T012-T013)
- Services (T012-T013) before mappers (T014-T015)
- Core implementation before integration (T018-T022)
- Everything before polish (T023-T027)

## Parallel Example
```bash
# After setup, launch contract and integration tests together:
Task: "Contract test for NHS parser in tests/contract/nhs-parser.contract.test.ts"
Task: "Contract test for Local Authority parser in tests/contract/local-authority-parser.contract.test.ts"
Task: "Integration test for NHS data fetching in tests/integration/nhs-fetcher.integration.test.ts"
Task: "Integration test for Local Authority fetching in tests/integration/local-authority-fetcher.integration.test.ts"

# After tests written, launch model creation in parallel:
Task: "Implement NHSTrust interface in src/models/nhs-trust.ts"
Task: "Implement LocalAuthority interface in src/models/local-authority.ts"

# After services implemented, launch mappers in parallel:
Task: "Create NHS mapper in src/services/mappers/nhs-mapper.ts"
Task: "Create Local Authority mapper in src/services/mappers/local-authority-mapper.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify all tests fail before implementing
- Commit after each task with descriptive message
- Use cheerio's jQuery-like API for HTML parsing
- Fail fast on any HTML structure changes
- Minimum counts: NHS ~215, Local Authorities ~408

## Validation Checklist
*GATE: Checked before returning*

- [x] All contracts have corresponding tests (T004-T005)
- [x] All entities have model tasks (T010-T011)
- [x] All tests come before implementation (T004-T009 before T010-T022)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task