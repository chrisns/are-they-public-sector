# Tasks: Project Publication and Documentation Update

**Input**: Design documents from `/specs/014-we-ve-done/`
**Prerequisites**: plan.md (required), spec.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extracted: Tailwind CSS, Alpine.js, Fuse.js, GitHub Actions
2. Load spec.md:
   → 27 functional requirements identified
   → Documentation, CI/CD, Website components needed
3. Generate tasks by category:
   → Documentation: README, LICENSE, source docs
   → CI/CD: GitHub Actions workflows
   → Website: HTML, search, filters, pagination
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T039)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Documentation & Licensing

- [ ] T001 Create LICENSE file with MIT license text
- [ ] T002 [P] Update README.md with current project statistics (59,977 orgs from 30 sources)
- [ ] T003 [P] Create docs/data-sources.md listing all 30+ data sources with details
- [ ] T004 [P] Update CLAUDE.md to reflect current codebase structure
- [ ] T005 [P] Create docs/api-reference.md documenting the Organisation data model

## Phase 3.2: GitHub Actions Setup

- [ ] T006 Create .github/workflows/build-and-test.yml for push/PR testing
- [ ] T007 Create .github/workflows/nightly-update.yml with cron schedule
- [ ] T008 Create .github/workflows/deploy-pages.yml for GitHub Pages deployment
- [ ] T009 Add workflow_dispatch to all workflows for manual triggering
- [ ] T010 Configure GitHub Pages in repository settings

## Phase 3.3: Website Structure Setup

- [ ] T011 Create website/ directory structure
- [ ] T012 Create website/index.html with semantic HTML5 structure
- [ ] T013 Create website/css/styles.css with Tailwind CSS setup
- [ ] T014 [P] Create website/js/app.js main application controller
- [ ] T015 [P] Create website/js/search.js for Fuse.js search implementation
- [ ] T016 [P] Create website/js/filters.js for type/location filtering
- [ ] T017 [P] Create website/js/pagination.js for client-side pagination

## Phase 3.4: Website Core Features

- [ ] T018 Implement data loader in app.js to fetch and parse orgs.json
- [ ] T019 Implement loading state and progress indicator
- [ ] T020 Initialize Fuse.js search index with organisation names
- [ ] T021 Implement search input with debouncing (300ms)
- [ ] T022 Create organisation card component showing name, type, status
- [ ] T023 Add data quality indicators to organisation cards
- [ ] T024 Implement type filter dropdown with all OrganisationType values
- [ ] T025 Implement location filter (England, Scotland, Wales, Northern Ireland)
- [ ] T026 Create pagination controls (50 items per page)
- [ ] T027 Implement organisation detail modal/panel

## Phase 3.5: Website Polish & Optimization

- [ ] T028 Add statistics dashboard showing total counts and breakdowns
- [ ] T029 Implement responsive design for mobile devices
- [ ] T030 Add error handling for failed data loads
- [ ] T031 Optimize for 70MB JSON file (lazy loading, compression)
- [ ] T032 Add "Download Data" button linking to raw orgs.json
- [ ] T033 Display last updated timestamp from data
- [ ] T034 Add keyboard navigation support
- [ ] T035 Implement print-friendly styles

## Phase 3.6: Testing & Deployment

- [ ] T036 Test website with sample data subset
- [ ] T037 Test search performance with full dataset
- [ ] T038 Test all filter combinations
- [ ] T039 Deploy to GitHub Pages and verify public access

## Dependencies

### Sequential Requirements:
- T001-T005 (Documentation) can run in parallel
- T006-T010 (GitHub Actions) must complete before deployment
- T011-T013 (Website structure) before T014-T017 (JS modules)
- T018-T019 (Data loading) before T020-T027 (Features)
- T028-T035 (Polish) after core features
- T036-T038 (Testing) before T039 (Deployment)

### Blocking Dependencies:
- T011 blocks all website tasks
- T012 blocks T022-T027 (needs HTML structure)
- T018 blocks T020 (needs data before search index)
- T020 blocks T021 (needs search index)
- All tasks before T039 (final deployment)

## Parallel Execution Examples

### Documentation Tasks (T002-T005):
```
Task: "Update README.md with current project statistics"
Task: "Create docs/data-sources.md listing all data sources"
Task: "Update CLAUDE.md to reflect current codebase"
Task: "Create docs/api-reference.md documenting Organisation model"
```

### JavaScript Modules (T014-T017):
```
Task: "Create website/js/app.js main application controller"
Task: "Create website/js/search.js for Fuse.js search"
Task: "Create website/js/filters.js for type/location filtering"
Task: "Create website/js/pagination.js for client-side pagination"
```

## Implementation Notes

### Documentation Tasks:
- Use current statistics from orgs.json output
- Document actual data sources from orchestrator.ts
- Include examples and code snippets in docs

### GitHub Actions:
- Use Node 18+ for consistency
- Include pnpm cache for faster builds
- Set up secrets for GitHub Pages deployment
- Schedule nightly runs at 2 AM UTC

### Website Development:
- Use CDN for Tailwind CSS, Alpine.js, Fuse.js, Chart.js
- Implement progressive enhancement
- Ensure functionality without JavaScript for basic viewing
- Use localStorage for user preferences
- Implement virtual scrolling if performance issues arise

### Testing:
- Create test dataset with 100 organisations
- Test on Chrome, Firefox, Safari, Edge
- Test on mobile devices (iOS, Android)
- Verify accessibility with screen readers

## Success Metrics
- [ ] All documentation accurate and complete
- [ ] GitHub Actions running successfully
- [ ] Website loads in <3 seconds
- [ ] Search returns results in <100ms
- [ ] All filters working correctly
- [ ] Mobile responsive design verified
- [ ] Data updates nightly without manual intervention