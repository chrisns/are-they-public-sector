# Claude Code Context

## Project Overview
UK Public Sector Organisation Aggregator - A TypeScript CLI that aggregates 34,792 active organisations from 30 government sources into unified JSON (filters out 25,187 inactive/dissolved entities).

## Tech Stack
- **Language**: TypeScript 5.x with ESM modules
- **Runtime**: Node.js 18+ with tsx
- **Package Manager**: pnpm
- **Testing**: Jest with ts-jest (80% coverage required)
- **Key Dependencies**: axios, xlsx, csv-parse, cheerio, pdf-parse (minimal dependencies)

## Commands
```bash
pnpm install          # Install dependencies
pnpm run compile      # Execute aggregator (generates dist/orgs.json ~40MB)
pnpm test            # Run all tests
pnpm run coverage    # Generate coverage report
pnpm run lint        # Type check with tsc --noEmit
```

## Project Structure
```text
src/
├── cli/
│   ├── index.ts         # Entry point with file size reporting
│   ├── orchestrator.ts  # Coordinates 30 data sources
│   └── logger.ts        # Console output with sections
├── services/
│   ├── fetcher.ts       # Base HTTP fetcher with retries
│   ├── parser.ts        # Excel parser (buffer support)
│   ├── parser-simple.ts # CSV parser (buffer support)
│   └── fetchers/        # 30 individual source fetchers
├── models/              # TypeScript interfaces
│   └── organisation.ts  # Core model with OrganisationType enum
└── lib/
    └── writer.ts        # JSON output writer

tests/
├── contract/           # API contract tests
├── integration/        # E2E pipeline tests
└── unit/              # Component unit tests

docs/
├── data-sources.md     # Details on all 30 sources
└── api-reference.md    # Organisation model documentation
```

## Testing Requirements
- TDD: Write failing tests first (RED-GREEN-Refactor)
- Test order: Contract → Integration → Unit
- 80% coverage minimum
- Mock external APIs, use real dependencies
- All source failures must return exit code 1

## Key Architecture Decisions
- **In-Memory Processing**: No temporary files, everything uses buffers
- **No Deduplication**: Removed to preserve all source records
- **Parallel Fetching**: Multiple sources fetched concurrently
- **Error = Failure**: Any source failure causes non-zero exit
- **Source Filtering**: --source flag for selective aggregation

## Data Sources (30 Total)
- **Education**: GIAS schools, NI schools, FE colleges
- **Healthcare**: NHS trusts, ICBs, health boards, healthwatch
- **Local Gov**: Unitary/district councils, community councils
- **Emergency**: Police forces, fire services
- **Government**: GOV.UK API, ONS classification, devolved bodies
- **Other**: Courts, ports, research councils, national parks

See `docs/data-sources.md` for complete details.

## Current Feature Branch
**014-we-ve-done**: Documentation, GitHub Actions CI/CD, and searchable website
- Tasks: T001-T039 in `specs/014-we-ve-done/tasks.md`
- Tech: Tailwind CSS, Alpine.js, Fuse.js for website
- CI/CD: Nightly updates, PR testing, GitHub Pages deployment

## Development Notes
- **Source IDs**: Each source has multiple IDs (e.g., `gias`, `schools`)
- **Fetcher Pattern**: All extend BaseFetcher with fetch() method
- **Buffer Processing**: Parser accepts string (path) or Buffer
- **Error Logging**: Failed sources log ERROR with source name
- **File Size**: Output logged in MB after generation
- **UTF-8**: Full support for Welsh/Scottish special characters

## Recent Major Changes
- Added filtering to exclude inactive/dissolved organisations (25,187 removed)
- Now only includes active/operational organisations (34,792 total)
- Removed all deduplication functionality
- Converted file-based to in-memory processing
- Fixed 404s in 5 fetchers (URLs updated)
- Added 30 total data sources
- Added file size reporting to CLI output

## Testing Helpers
```bash
# Test individual source
pnpm run compile -- --source schools

# Check for 404 errors
pnpm run compile 2>&1 | grep ERROR

# Verify output size
ls -lh dist/orgs.json  # Should be ~40MB
```

## Common Issues & Fixes
- **404 Errors**: Check fetcher URLs match current websites
- **Test Failures**: Update expectations after adding sources
- **Type Errors**: Use proper types instead of `any`
- **Memory Issues**: Use streaming for large datasets

---
*Auto-generated context for AI assistants. Keep under 150 lines.*