# Tasks: Fix Organization Count Discrepancies

**Input**: Design documents from `/specs/002-the-current-implementation/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
Fix aggregator to return exactly 4028 organizations:
- GOV.UK API: 611 organizations
- ONS Institutional Units: 3360 organizations
- ONS Non-Institutional Units: 57 organizations
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup & Debugging
- [ ] T001 Enable debug logging in src/cli/index.ts to see detailed fetch/parse output
- [ ] T002 [P] Create debugging script to test GOV.UK API pagination directly
- [ ] T003 [P] Create debugging script to list ONS Excel sheet names

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test for GOV.UK API returns 611 orgs in tests/contract/govuk-api.test.ts
- [ ] T005 [P] Contract test for ONS Excel Institutional Units tab has 3360 records in tests/contract/ons-institutional.test.ts
- [ ] T006 [P] Contract test for ONS Excel Non-Institutional Units tab has 57 records in tests/contract/ons-non-institutional.test.ts
- [ ] T007 [P] Integration test for complete aggregation returns 4028 orgs in tests/integration/full-aggregation-count.test.ts
- [ ] T008 [P] Integration test for deduplication preserves all unique orgs in tests/integration/deduplication-count.test.ts

## Phase 3.3: Core Implementation - Fix Fetcher (ONLY after tests are failing)
- [ ] T009 Fix GOV.UK API pagination in src/services/fetcher.ts - check for 'links.next' or 'page' params instead of 'next_page_url'
- [ ] T010 Update ONS Excel scraping in src/services/fetcher.ts - prioritize .xlsx files and latest classification guide
- [ ] T011 Add count validation logging in src/services/fetcher.ts after each fetch operation
- [ ] T012 Test fetcher fixes manually with debugging scripts

## Phase 3.4: Core Implementation - Fix Parser
- [ ] T013 Fix ONS sheet name detection in src/services/parser.ts - look for exact "Organisation|Institutional Unit" tab
- [ ] T014 Fix ONS sheet name detection in src/services/parser.ts - look for exact "Non-Institutional Units" tab
- [ ] T015 Add debug logging in src/services/parser.ts to show found sheet names and record counts
- [ ] T016 Update column name mapping in src/services/parser.ts to be more flexible

## Phase 3.5: Integration & Validation
- [ ] T017 Update orchestrator in src/cli/orchestrator.ts to log count at each stage
- [ ] T018 Add count assertions in src/cli/orchestrator.ts - warn if counts don't match expected
- [ ] T019 Fix deduplicator in src/services/deduplicator.ts if dropping records
- [ ] T020 Verify writer in src/lib/writer.ts outputs all 4028 organizations

## Phase 3.6: Testing & Verification
- [ ] T021 Run full test suite: pnpm test
- [ ] T022 Verify contract tests pass with correct counts
- [ ] T023 Verify integration tests pass with 4028 total
- [ ] T024 Run aggregator and verify output: pnpm run compile
- [ ] T025 Check output file has 4028 orgs: jq '.metadata.statistics.totalOrganisations' dist/orgs.json

## Phase 3.7: Polish & Documentation
- [ ] T026 [P] Add unit tests for pagination logic in tests/unit/fetcher-pagination.test.ts
- [ ] T027 [P] Add unit tests for sheet name matching in tests/unit/parser-sheets.test.ts
- [ ] T028 [P] Update README.md with troubleshooting section for count issues
- [ ] T029 Remove debug logging added in T001
- [ ] T030 Add permanent count monitoring to catch future discrepancies

## Dependencies
- Setup (T001-T003) before everything
- Tests (T004-T008) before implementation (T009-T020)
- Fetcher fixes (T009-T012) can run parallel with Parser fixes (T013-T016)
- Integration (T017-T020) after core fixes
- Testing (T021-T025) after integration
- Polish (T026-T030) after verification

## Parallel Execution Examples

### Launch contract tests together (T004-T006):
```
Task: "Contract test for GOV.UK API returns 611 orgs in tests/contract/govuk-api.test.ts"
Task: "Contract test for ONS Institutional Units has 3360 records in tests/contract/ons-institutional.test.ts"
Task: "Contract test for ONS Non-Institutional Units has 57 records in tests/contract/ons-non-institutional.test.ts"
```

### Fix fetcher and parser in parallel (T009-T011 with T013-T016):
```
# Terminal 1: Fix fetcher issues
Task: "Fix GOV.UK API pagination in src/services/fetcher.ts"
Task: "Update ONS Excel scraping in src/services/fetcher.ts"

# Terminal 2: Fix parser issues
Task: "Fix ONS sheet detection for Institutional Units in src/services/parser.ts"
Task: "Fix ONS sheet detection for Non-Institutional Units in src/services/parser.ts"
```

### Run final tests in parallel (T026-T028):
```
Task: "Add unit tests for pagination logic in tests/unit/fetcher-pagination.test.ts"
Task: "Add unit tests for sheet matching in tests/unit/parser-sheets.test.ts"
Task: "Update README.md with troubleshooting section"
```

## Success Criteria
- [ ] GOV.UK API returns exactly 611 organizations
- [ ] ONS Institutional Units returns exactly 3360 organizations
- [ ] ONS Non-Institutional Units returns exactly 57 organizations
- [ ] Total aggregated output contains exactly 4028 organizations
- [ ] All contract tests pass
- [ ] All integration tests pass
- [ ] No data loss during aggregation

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing (RED-GREEN-Refactor)
- Commit after each task with descriptive message
- Use debug logging to diagnose issues
- Remove debug code before final commit

## Quick Commands
```bash
# Run specific test
pnpm test tests/contract/govuk-api.test.ts

# Run aggregator with debug
pnpm run compile -- --debug

# Check counts in output
jq '.metadata.statistics' dist/orgs.json

# Verify each source
jq '.metadata.sources' dist/orgs.json
```