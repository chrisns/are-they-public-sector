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
Adding Welsh/Scottish Community Councils and NI Health Trusts:
- Welsh Community Councils: ~1,100 from Wikipedia
- Scottish Community Councils: ~1,200 from Wikipedia
- NI Health and Social Care Trusts: 6 from NI Direct
- HTML scraping with cheerio for all three sources
- Performance target: Under 30 seconds total

## Key Files
- `specs/012-welsh-community-councils/spec.md` - Feature specification
- `specs/012-welsh-community-councils/plan.md` - Implementation plan
- `specs/012-welsh-community-councils/contracts/` - Service contracts
- `src/services/fetchers/welsh-councils-fetcher.ts` - Welsh councils (NEW)
- `src/services/fetchers/scottish-councils-fetcher.ts` - Scottish councils (NEW)
- `src/services/fetchers/ni-health-trusts-fetcher.ts` - NI Health Trusts (NEW)
- `src/services/mappers/community-councils-mapper.ts` - Mapper for new types (NEW)

## Development Notes
- Wikipedia page parsing with flexible selectors
- Active/inactive status detection for Scottish councils
- Optional detail page fetching for NI Health Trusts
- Retry logic with exponential backoff for all sources
- UTF-8 handling for Welsh and Scottish names

## Recent Changes
- Branch 012-welsh-community-councils: Adding Welsh/Scottish councils and NI Health Trusts
- Branch 011-i-have-found: Replacing GIAS JSON scraping with CSV download
- Branch 010-you-can-discover: Added Groundwork Trusts and NHS Charities

---
*Auto-generated context for AI assistants. Keep under 150 lines.*