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
Adding Northern Ireland Schools:
- NI Education Department: Two-phase HTTP request (ViewState + Export)
- Excel parsing: Extract ~1122 open schools with full metadata
- Validation: Count must be ~1122 (±10% tolerance)
- New parser: ni-schools-parser.ts with cheerio and xlsx
- Fail-fast on service unavailability or format changes

## Key Files
- `specs/008-ni-schools-you/spec.md` - NI Schools feature specification
- `specs/008-ni-schools-you/plan.md` - Implementation plan
- `specs/008-ni-schools-you/contracts/` - Parser contracts
- `src/services/ni-schools-parser.ts` - NI Schools parser (NEW)
- `src/services/mappers/ni-schools-mapper.ts` - Maps to Organisation (NEW)

## Development Notes
- HTML scraping using cheerio for webpage parsing
- PDF parsing using pdf-parse for table extraction
- Dynamic PDF URLs require fetching webpage first
- Count validation ensures data integrity
- Fail-fast approach for nightly runs

## Recent Changes
- Branch 008-ni-schools-you: Adding Northern Ireland Schools data
- Two-phase HTTP with ViewState/EventValidation for ASP.NET forms
- Excel parsing for ~1122 schools with metadata extraction
- Branch 007-we-re-already: Added UK Colleges (Scotland, Wales, NI)
- Branch 006-you-can-find: Added emergency services (Police, Fire)

---
*Auto-generated context for AI assistants. Keep under 150 lines.*