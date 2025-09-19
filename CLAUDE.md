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
Adding UK Government Organisation Data Sources (12 sources):
- English Unitary Authorities: Dynamic CSV from ONS
- Districts of England: ~164 from Wikipedia
- Welsh Unitary Authorities: 22 from Law.gov.wales
- Scottish orgs: MyGov.scot directory
- Health: ICBs, Health Boards, Local Healthwatch (paginated)
- Transport: Scottish RTPs, NI Trust Ports
- Other: Research Councils, National Parks, NI Departments

## Key Files
- `specs/013-unitary-authorities-england/` - Current feature specs
- `src/services/fetchers/` - 12 new fetcher services (NEW)
  - english-unitary-authorities-fetcher.ts
  - districts-of-england-fetcher.ts
  - local-healthwatch-fetcher.ts (paginated)
  - Plus 9 other source fetchers
- `src/services/mappers/` - Type-specific mappers (NEW)
- `src/cli/orchestrator.ts` - Update to include new sources

## Development Notes
- Dynamic CSV link extraction from ONS page
- Pagination handling for Healthwatch (iterate all pages)
- HTML scraping with cheerio for 11 sources
- CSV parsing for ONS data
- Retry logic with exponential backoff
- UTF-8 handling for special characters
- Deduplication across multiple sources

## Recent Changes
- Branch 013-unitary-authorities-england: Adding 12 UK gov data sources
- Branch 012-welsh-community-councils: Welsh/Scottish councils and NI Health Trusts
- Branch 011-i-have-found: GIAS CSV download replacement

---
*Auto-generated context for AI assistants. Keep under 150 lines.*