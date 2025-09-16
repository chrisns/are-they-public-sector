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
Adding UK Courts and Tribunals data:
- English/Welsh Courts: CSV from factprod.blob.core.windows.net
- NI Courts: HTML parsing from nidirect.gov.uk
- Scottish Courts: API/network requests or fallback data
- New parsers: english-courts-parser.ts, ni-courts-parser.ts, scottish-courts-parser.ts
- No deduplication between sources, extract all available courts

## Key Files
- `specs/009-english-courts-can/spec.md` - UK Courts feature specification
- `specs/009-english-courts-can/plan.md` - Implementation plan
- `specs/009-english-courts-can/contracts/` - Parser contracts
- `src/services/english-courts-parser.ts` - English Courts CSV parser (NEW)
- `src/services/ni-courts-parser.ts` - NI Courts HTML parser (NEW)
- `src/services/scottish-courts-parser.ts` - Scottish Courts parser (NEW)
- `src/services/mappers/courts-mapper.ts` - Maps to Organisation (NEW)

## Development Notes
- HTML scraping using cheerio for webpage parsing
- PDF parsing using pdf-parse for table extraction
- Dynamic PDF URLs require fetching webpage first
- Count validation ensures data integrity
- Fail-fast approach for nightly runs

## Recent Changes
- Branch 009-english-courts-can: Adding UK Courts and Tribunals data
- CSV parsing for English/Welsh courts, HTML for NI courts
- Fallback strategy for Scottish courts data
- Branch 008-ni-schools-you: Added Northern Ireland Schools (~1122)
- Branch 007-we-re-already: Added UK Colleges (Scotland, Wales, NI)

---
*Auto-generated context for AI assistants. Keep under 150 lines.*