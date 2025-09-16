# Claude Code Context

## Project Overview
UK Public Sector Organisation Aggregator - A TypeScript CLI tool that aggregates organisation data from multiple government sources into a unified JSON format.

## Tech Stack
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+ with tsx
- **Package Manager**: pnpm
- **Testing**: Jest with ts-jest (80% coverage required)
- **Key Dependencies**: axios, xlsx, commander, cheerio, pdf-parse (minimal dependencies policy)

## Commands
```bash
pnpm install          # Install dependencies
pnpm run compile      # Execute aggregator (tsx src/cli/index.ts)
pnpm test            # Run all tests
pnpm run coverage    # Generate coverage report
pnpm run lint        # Type check with tsc --noEmit
```

## Project Structure
```text
src/
├── models/          # TypeScript interfaces
├── services/        # Core logic (fetcher, parser, mapper, deduplicator)
├── cli/            # CLI entry point
└── lib/            # Utilities (writer)

tests/
├── contract/       # API contract tests
├── integration/    # E2E tests
├── mocks/         # Test data
└── unit/          # Unit tests
```

## Testing Requirements
- TDD: Write failing tests first (RED-GREEN-Refactor)
- Test order: Contract → Integration → Unit
- 80% coverage minimum
- Use real dependencies, mock external APIs

## Current Feature
Replacing GIAS school data collection with CSV download:
- Remove JSON scraping from schools-fetcher.ts (performance issues)
- New GIAS CSV fetcher: Direct download from get-information-schools.service.gov.uk
- Session management with cookies and CSRF tokens
- ZIP extraction and CSV parsing (~52,000 schools)
- Performance target: Under 30 seconds (vs 3-5 minutes current)

## Key Files
- `specs/011-i-have-found/spec.md` - GIAS CSV replacement specification
- `specs/011-i-have-found/plan.md` - Implementation plan
- `specs/011-i-have-found/contracts/` - Service contracts
- `src/services/gias-csv-fetcher.ts` - GIAS CSV download service (NEW)
- `src/services/schools-fetcher.ts` - JSON scraper to be REMOVED
- `src/services/mappers/schools-mapper.ts` - Update for CSV fields
- `test/gias.js` - Reference implementation for approach

## Development Notes
- Session cookie management for bot detection bypass
- CSRF token extraction from HTML for form submission
- ZIP file extraction using Node.js zlib
- CSV parsing with streaming for memory efficiency
- Retry logic with exponential backoff for resilience

## Recent Changes
- Branch 011-i-have-found: Replacing GIAS JSON scraping with CSV download
- Branch 010-you-can-discover: Added Groundwork Trusts and NHS Charities
- Branch 009-english-courts-can: Added UK Courts and Tribunals (~863)
- Branch 008-ni-schools-you: Added Northern Ireland Schools (~1122)

---
*Auto-generated context for AI assistants. Keep under 150 lines.*