# Tasks: Welsh and Scottish Community Councils & NI Health Trusts

**Input**: Design documents from `/specs/012-welsh-community-councils/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.x, Node.js 18+, axios, cheerio, Jest
   → Structure: Single project (src/, tests/)
2. Load optional design documents:
   → data-model.md: 3 raw entities, 1 Organisation mapping
   → contracts/: 4 contract files (3 fetchers, 1 mapper)
   → research.md: HTML scraping approach, retry logic
3. Generate tasks by category:
   → Setup: Minimal (existing project structure)
   → Tests: 7 contract tests, 3 integration tests
   → Core: 3 fetchers, 2 parsers, 1 mapper
   → Integration: CLI integration, deduplication
   → Polish: Unit tests, performance validation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T030)
6. Tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- TypeScript files in `src/services/fetchers/`, `src/services/parsers/`, `src/services/mappers/`
- Test files in `tests/contract/`, `tests/integration/`, `tests/unit/`

## Phase 3.1: Setup
- [ ] T001 Verify project dependencies (axios, cheerio, jest already installed per plan.md)
- [ ] T002 [P] Create directory structure: `src/services/fetchers/`, `src/services/parsers/`
- [ ] T003 [P] Update TypeScript types in `src/models/organisation.ts` with new OrganisationType enum values

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### Contract Tests [P] - All can run in parallel
- [ ] T004 [P] Create failing test `tests/contract/welsh-councils-fetcher.test.ts` - verify fetch() returns WelshCommunityRaw[]
- [ ] T005 [P] Create failing test `tests/contract/scottish-councils-fetcher.test.ts` - verify fetch() returns ScottishCommunityRaw[]
- [ ] T006 [P] Create failing test `tests/contract/ni-health-trusts-fetcher.test.ts` - verify fetch() returns NIHealthTrustRaw[]
- [ ] T007 [P] Create failing test `tests/contract/community-councils-mapper.test.ts` - verify mapping to Organisation model

### Integration Tests [P]
- [ ] T008 [P] Create failing test `tests/integration/welsh-councils-pipeline.test.ts` - test full fetch→parse→map flow
- [ ] T009 [P] Create failing test `tests/integration/scottish-councils-pipeline.test.ts` - test full fetch→parse→map flow
- [ ] T010 [P] Create failing test `tests/integration/ni-health-trusts-pipeline.test.ts` - test full fetch→parse→map flow

## Phase 3.3: Core Implementation

### Data Models [P]
- [ ] T011 [P] Create interfaces in `src/models/welsh-community.ts` - WelshCommunityRaw interface
- [ ] T012 [P] Create interfaces in `src/models/scottish-community.ts` - ScottishCommunityRaw interface
- [ ] T013 [P] Create interfaces in `src/models/ni-health-trust.ts` - NIHealthTrustRaw interface

### Fetcher Services [P]
- [ ] T014 [P] Implement `src/services/fetchers/welsh-councils-fetcher.ts` - fetch HTML, parse with cheerio, extract ~1100 councils
- [ ] T015 [P] Implement `src/services/fetchers/scottish-councils-fetcher.ts` - fetch HTML, parse lists, handle asterisk markers
- [ ] T016 [P] Implement `src/services/fetchers/ni-health-trusts-fetcher.ts` - fetch main page, optionally follow detail links

### Parser Services [P]
- [ ] T017 [P] Implement `src/services/parsers/community-councils-parser.ts` - handle Wikipedia nested list structures
- [ ] T018 [P] Implement `src/services/parsers/health-trusts-parser.ts` - extract trust data from NI Direct HTML

### Mapper Service
- [ ] T019 Implement `src/services/mappers/community-councils-mapper.ts` - map all three types to Organisation model

## Phase 3.4: Integration

### CLI Integration
- [ ] T020 Update `src/cli/index.ts` - add new fetchers to aggregation pipeline
- [ ] T021 Update `src/services/aggregator.ts` - integrate new sources into main flow
- [ ] T022 Update `src/services/deduplicator.ts` - handle new organisation types in deduplication

### Validation
- [ ] T023 Run all contract tests - verify they pass with implementation
- [ ] T024 Run all integration tests - verify end-to-end flows work
- [ ] T025 Execute quickstart.md scenarios - verify manual testing passes

## Phase 3.5: Polish [P]

### Unit Tests
- [ ] T026 [P] Create unit tests `tests/unit/welsh-councils-parser.test.ts` - test HTML parsing edge cases
- [ ] T027 [P] Create unit tests `tests/unit/scottish-councils-parser.test.ts` - test active/inactive detection
- [ ] T028 [P] Create unit tests `tests/unit/normalizeId.test.ts` - test ID generation function

### Performance & Documentation
- [ ] T029 [P] Performance validation - ensure all three sources complete in <30 seconds total
- [ ] T030 [P] Update README.md - add new data sources to documentation

## Dependency Graph
```
Setup (T001-T003)
    ↓
Tests (T004-T010) [MUST RUN FIRST - TDD]
    ↓
Models (T011-T013) [Can run in parallel]
    ↓
Fetchers & Parsers (T014-T018) [Can run in parallel]
    ↓
Mapper (T019)
    ↓
Integration (T020-T022)
    ↓
Validation (T023-T025)
    ↓
Polish (T026-T030) [Can run in parallel]
```

## Parallel Execution Examples

### Example 1: Run all contract tests in parallel
```bash
# Using Task agents - can launch simultaneously
Task: "Create contract test for Welsh councils fetcher at tests/contract/welsh-councils-fetcher.test.ts"
Task: "Create contract test for Scottish councils fetcher at tests/contract/scottish-councils-fetcher.test.ts"
Task: "Create contract test for NI health trusts fetcher at tests/contract/ni-health-trusts-fetcher.test.ts"
Task: "Create contract test for community councils mapper at tests/contract/community-councils-mapper.test.ts"
```

### Example 2: Implement all fetchers in parallel (after tests written)
```bash
# T014, T015, T016 can all run simultaneously as they're different files
Task: "Implement Welsh councils fetcher with HTML scraping using cheerio"
Task: "Implement Scottish councils fetcher with active status detection"
Task: "Implement NI health trusts fetcher with optional detail page following"
```

### Example 3: Polish phase parallelization
```bash
# T026-T030 can all execute in parallel
Task: "Create unit tests for Welsh councils parser edge cases"
Task: "Create unit tests for Scottish councils active/inactive logic"
Task: "Create unit tests for ID normalization function"
Task: "Validate performance is under 30 seconds"
Task: "Update README with new data sources"
```

## Validation Checklist
- ✓ All 4 contracts have test tasks (T004-T007)
- ✓ All 3 raw entities have model tasks (T011-T013)
- ✓ All 3 fetchers have implementation tasks (T014-T016)
- ✓ Mapper implementation included (T019)
- ✓ CLI integration included (T020-T022)
- ✓ Performance validation included (T029)
- ✓ Tests before implementation (Phase 3.2 before 3.3)

## Notes
- Fetchers include retry logic with exponential backoff (per research.md)
- Welsh/Scottish parsers must handle UTF-8 characters properly
- Only active Scottish councils should be included (asterisk marker)
- Expected counts: ~1100 Welsh, ~1200 Scottish, 6 NI trusts
- Performance target: <30 seconds total for all three sources