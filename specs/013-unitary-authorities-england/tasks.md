# Tasks: UK Government Organisation Data Sources

**Input**: Design documents from `/specs/013-unitary-authorities-england/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, axios, cheerio, csv-parse, Jest
   → Structure: Single project (existing CLI aggregator)
2. Load optional design documents:
   → data-model.md: Organisation types and enums
   → contracts/: 12 fetcher contracts, 6 mapper contracts
   → research.md: HTML selectors and parsing strategies
3. Generate tasks by category:
   → Setup: Model extensions, type definitions
   → Tests: 12 contract tests, 12 integration tests
   → Core: 12 fetchers, 6 mappers
   → Integration: Orchestrator update
   → Polish: E2E test, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T044)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [ ] T001 Extend Organisation model with new types in src/models/organisation.ts
- [ ] T002 Create DataSource enum in src/models/data-source.ts
- [ ] T003 [P] Create type definitions for source-specific data in src/models/source-data.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (all can run in parallel)
- [ ] T004 [P] Contract test for EnglishUnitaryAuthoritiesFetcher in tests/contract/english-unitary-authorities-fetcher.test.ts
- [ ] T005 [P] Contract test for DistrictsOfEnglandFetcher in tests/contract/districts-of-england-fetcher.test.ts
- [ ] T006 [P] Contract test for NationalParkAuthoritiesFetcher in tests/contract/national-park-authorities-fetcher.test.ts
- [ ] T007 [P] Contract test for IntegratedCareBoardsFetcher in tests/contract/integrated-care-boards-fetcher.test.ts
- [ ] T008 [P] Contract test for LocalHealthwatchFetcher in tests/contract/local-healthwatch-fetcher.test.ts
- [ ] T009 [P] Contract test for ScottishGovernmentOrgsFetcher in tests/contract/scottish-government-orgs-fetcher.test.ts
- [ ] T010 [P] Contract test for NHSScotlandBoardsFetcher in tests/contract/nhs-scotland-boards-fetcher.test.ts
- [ ] T011 [P] Contract test for ScottishRTPsFetcher in tests/contract/scottish-rtps-fetcher.test.ts
- [ ] T012 [P] Contract test for WelshUnitaryAuthoritiesFetcher in tests/contract/welsh-unitary-authorities-fetcher.test.ts
- [ ] T013 [P] Contract test for NITrustPortsFetcher in tests/contract/ni-trust-ports-fetcher.test.ts
- [ ] T014 [P] Contract test for NIGovernmentDeptsFetcher in tests/contract/ni-government-depts-fetcher.test.ts
- [ ] T015 [P] Contract test for UKResearchCouncilsFetcher in tests/contract/uk-research-councils-fetcher.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Fetcher Implementations (can develop in parallel)
- [ ] T016 [P] Implement EnglishUnitaryAuthoritiesFetcher with dynamic CSV link in src/services/fetchers/english-unitary-authorities-fetcher.ts
- [ ] T017 [P] Implement DistrictsOfEnglandFetcher with Wikipedia parsing in src/services/fetchers/districts-of-england-fetcher.ts
- [ ] T018 [P] Implement NationalParkAuthoritiesFetcher in src/services/fetchers/national-park-authorities-fetcher.ts
- [ ] T019 [P] Implement IntegratedCareBoardsFetcher in src/services/fetchers/integrated-care-boards-fetcher.ts
- [ ] T020 [P] Implement LocalHealthwatchFetcher with pagination in src/services/fetchers/local-healthwatch-fetcher.ts
- [ ] T021 [P] Implement ScottishGovernmentOrgsFetcher in src/services/fetchers/scottish-government-orgs-fetcher.ts
- [ ] T022 [P] Implement NHSScotlandBoardsFetcher in src/services/fetchers/nhs-scotland-boards-fetcher.ts
- [ ] T023 [P] Implement ScottishRTPsFetcher in src/services/fetchers/scottish-rtps-fetcher.ts
- [ ] T024 [P] Implement WelshUnitaryAuthoritiesFetcher in src/services/fetchers/welsh-unitary-authorities-fetcher.ts
- [ ] T025 [P] Implement NITrustPortsFetcher in src/services/fetchers/ni-trust-ports-fetcher.ts
- [ ] T026 [P] Implement NIGovernmentDeptsFetcher in src/services/fetchers/ni-government-depts-fetcher.ts
- [ ] T027 [P] Implement UKResearchCouncilsFetcher in src/services/fetchers/uk-research-councils-fetcher.ts

### Mapper Implementations (can develop in parallel)
- [ ] T028 [P] Implement UnitaryAuthorityMapper in src/services/mappers/unitary-authority-mapper.ts
- [ ] T029 [P] Implement DistrictCouncilMapper in src/services/mappers/district-council-mapper.ts
- [ ] T030 [P] Implement HealthOrganisationMapper in src/services/mappers/health-organisation-mapper.ts
- [ ] T031 [P] Implement TransportPartnershipMapper in src/services/mappers/transport-partnership-mapper.ts
- [ ] T032 [P] Implement ResearchCouncilMapper in src/services/mappers/research-council-mapper.ts
- [ ] T033 [P] Implement GovernmentDepartmentMapper in src/services/mappers/government-department-mapper.ts

## Phase 3.4: Integration

### Integration Tests (can run in parallel after fetchers/mappers ready)
- [ ] T034 [P] Integration test for English Unitary Authorities pipeline in tests/integration/english-unitary-authorities-pipeline.test.ts
- [ ] T035 [P] Integration test for Districts pipeline in tests/integration/districts-of-england-pipeline.test.ts
- [ ] T036 [P] Integration test for Health organisations pipeline in tests/integration/health-organisations-pipeline.test.ts
- [ ] T037 [P] Integration test for Scottish organisations pipeline in tests/integration/scottish-organisations-pipeline.test.ts
- [ ] T038 [P] Integration test for Welsh authorities pipeline in tests/integration/welsh-authorities-pipeline.test.ts
- [ ] T039 [P] Integration test for NI organisations pipeline in tests/integration/ni-organisations-pipeline.test.ts
- [ ] T040 [P] Integration test for Research Councils pipeline in tests/integration/research-councils-pipeline.test.ts

### Orchestrator Update
- [ ] T041 Add all 12 new fetchers to orchestrator in src/cli/orchestrator.ts
- [ ] T042 Update deduplication logic for new organisation types in src/services/deduplicator.ts

## Phase 3.5: Polish
- [ ] T043 E2E test for complete aggregation with all sources in tests/integration/uk-gov-organisations-e2e.test.ts
- [ ] T044 Run full test suite and verify 80% coverage with pnpm run coverage

## Dependencies
- Setup (T001-T003) before everything
- Contract tests (T004-T015) before fetcher implementations (T016-T027)
- Fetchers complete before mappers (T028-T033)
- Fetchers and mappers complete before integration tests (T034-T040)
- All components complete before orchestrator update (T041-T042)
- Everything complete before E2E test (T043-T044)

## Parallel Execution Examples

### Launch all contract tests together (T004-T015):
```bash
# Using Task agents in parallel
Task: "Contract test for EnglishUnitaryAuthoritiesFetcher in tests/contract/english-unitary-authorities-fetcher.test.ts"
Task: "Contract test for DistrictsOfEnglandFetcher in tests/contract/districts-of-england-fetcher.test.ts"
Task: "Contract test for NationalParkAuthoritiesFetcher in tests/contract/national-park-authorities-fetcher.test.ts"
# ... and 9 more
```

### Launch all fetcher implementations together (T016-T027):
```bash
# After contract tests are failing
Task: "Implement EnglishUnitaryAuthoritiesFetcher with dynamic CSV link in src/services/fetchers/english-unitary-authorities-fetcher.ts"
Task: "Implement DistrictsOfEnglandFetcher with Wikipedia parsing in src/services/fetchers/districts-of-england-fetcher.ts"
# ... and 10 more
```

### Launch all mapper implementations together (T028-T033):
```bash
Task: "Implement UnitaryAuthorityMapper in src/services/mappers/unitary-authority-mapper.ts"
Task: "Implement DistrictCouncilMapper in src/services/mappers/district-council-mapper.ts"
# ... and 4 more
```

## Notes
- All contract tests MUST fail before implementing fetchers (TDD RED phase)
- Fetchers make contract tests pass (TDD GREEN phase)
- Integration tests verify the complete pipeline
- Orchestrator update happens last to integrate everything
- Each source is independent, enabling high parallelism
- Pagination handling critical for LocalHealthwatch (T020)
- Dynamic link extraction critical for ONS (T016)
- UTF-8 handling important for Welsh/Scottish names

## Validation Checklist
- [x] All 12 fetcher contracts have corresponding test tasks
- [x] All 6 mapper types have implementation tasks
- [x] All tests come before implementation (T004-T015 before T016-T033)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task in same phase