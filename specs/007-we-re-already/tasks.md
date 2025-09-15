# Tasks: Add UK Colleges (Scotland, Wales, Northern Ireland)

**Input**: Design documents from `/specs/007-we-re-already/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → SUCCESS: TypeScript CLI, pdf-parse, cheerio, axios
   → Extract: Single project structure
2. Load optional design documents:
   → data-model.md: College, CollegesResult entities
   → contracts/: colleges-parser.contract.ts
   → research.md: pdf-parse for PDFs, cheerio for HTML
3. Generate tasks by category:
   → Setup: Add pdf-parse dependency
   → Tests: Contract tests for all parser methods
   → Core: College model, parser service, mapper
   → Integration: Orchestrator integration, CLI option
   → Polish: Unit tests, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T023)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests? YES
   → All entities have models? YES
   → All endpoints implemented? N/A (CLI tool)
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- All paths below use single project structure per plan.md

## Phase 3.1: Setup
- [ ] T001 Install pdf-parse dependency: `pnpm add pdf-parse @types/pdf-parse`
- [ ] T002 [P] Create test mock directories: `mkdir -p tests/mocks`
- [ ] T003 [P] Download sample webpage HTML to tests/mocks/aoc-webpage.html for testing

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test for webpage fetching in tests/contract/colleges-parser.contract.test.ts (Webpage Fetching section)
- [ ] T005 [P] Contract test for PDF link extraction in tests/contract/colleges-parser.contract.test.ts (PDF Link Extraction section)
- [ ] T006 [P] Contract test for college count extraction in tests/contract/colleges-parser.contract.test.ts (College Count Extraction section)
- [ ] T007 [P] Contract test for PDF parsing in tests/contract/colleges-parser.contract.test.ts (PDF Parsing section)
- [ ] T008 [P] Contract test for count validation in tests/contract/colleges-parser.contract.test.ts (Count Validation section)
- [ ] T009 [P] Contract test for full aggregation in tests/contract/colleges-parser.contract.test.ts (Full Aggregation section)
- [ ] T010 [P] Contract test for mapper in tests/contract/colleges-parser.contract.test.ts (CollegesMapper Contract section)
- [ ] T011 [P] Integration test for complete flow in tests/integration/colleges-aggregation.integration.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T012 [P] Create College model in src/models/college.ts with College and CollegesResult interfaces
- [ ] T013 Create CollegesParser service in src/services/colleges-parser.ts with fetchWebpage method
- [ ] T014 Add extractPdfLinks method to src/services/colleges-parser.ts
- [ ] T015 Add extractCounts method to src/services/colleges-parser.ts
- [ ] T016 Add downloadPdf method to src/services/colleges-parser.ts
- [ ] T017 Add parsePdf method to src/services/colleges-parser.ts using pdf-parse
- [ ] T018 Add validateCounts method to src/services/colleges-parser.ts
- [ ] T019 Add aggregate method to src/services/colleges-parser.ts orchestrating all methods
- [ ] T020 [P] Create CollegesMapper in src/services/mappers/colleges-mapper.ts

## Phase 3.4: Integration
- [ ] T021 Update orchestrator.ts to import and call CollegesParser for 'colleges-uk' source
- [ ] T022 Add 'colleges-uk' option to CLI arguments in src/cli/index.ts
- [ ] T023 Update orchestrator's performCompleteAggregation to include colleges when no source filter

## Phase 3.5: Polish
- [ ] T024 [P] Unit tests for CollegesMapper in tests/unit/colleges-mapper.unit.test.ts
- [ ] T025 [P] Add retry logic with exponential backoff for PDF downloads
- [ ] T026 [P] Add detailed logging to CollegesParser for debugging
- [ ] T027 Run quickstart.md validation steps manually
- [ ] T028 Update README.md to include colleges data source

## Dependencies
- Setup (T001-T003) must complete first
- Tests (T004-T011) before implementation (T012-T020)
- T012 blocks T020 (mapper needs model)
- T013 blocks T014-T019 (methods added to same file)
- T013-T019 must be sequential (same file)
- T021-T023 after core implementation
- Polish tasks after everything else

## Parallel Example
```bash
# Launch T004-T011 together (all test files):
Task: "Contract test for webpage fetching in tests/contract/colleges-parser.contract.test.ts"
Task: "Contract test for PDF link extraction in tests/contract/colleges-parser.contract.test.ts"
Task: "Contract test for college count extraction in tests/contract/colleges-parser.contract.test.ts"
Task: "Contract test for PDF parsing in tests/contract/colleges-parser.contract.test.ts"
Task: "Contract test for count validation in tests/contract/colleges-parser.contract.test.ts"
Task: "Contract test for full aggregation in tests/contract/colleges-parser.contract.test.ts"
Task: "Contract test for mapper in tests/contract/colleges-parser.contract.test.ts"
Task: "Integration test for complete flow in tests/integration/colleges-aggregation.integration.test.ts"

# After tests, launch T012 and T020 together (different files):
Task: "Create College model in src/models/college.ts"
Task: "Create CollegesMapper in src/services/mappers/colleges-mapper.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- T013-T019 are sequential (same file: colleges-parser.ts)
- Verify all tests fail before implementing
- Commit after each task
- Use real AoC webpage for contract tests (with fallback to mocks)
- PDF parsing must handle table extraction

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - colleges-parser.contract.ts → 7 test sections → T004-T010

2. **From Data Model**:
   - College entity → T012 (model creation)
   - CollegesResult entity → included in T012
   - Organisation mapping → T020 (mapper)

3. **From User Stories**:
   - Full aggregation story → T011 (integration test)
   - Quickstart validation → T027

4. **Ordering**:
   - Setup → Tests → Models → Services → Integration → Polish
   - Sequential tasks for same file edits

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T004-T010)
- [x] All entities have model tasks (T012)
- [x] All tests come before implementation (T004-T011 before T012-T020)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (T013-T019 sequential)