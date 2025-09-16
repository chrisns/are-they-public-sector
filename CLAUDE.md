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
Adding Groundwork Trusts and NHS Charities data:
- Groundwork Trusts: HTML scraping from dropdown at groundwork.org.uk/find-groundwork-near-me
- NHS Charities: API discovery from nhscharitiestogether.co.uk then fetch JSON
- New parsers: groundwork-parser.ts, nhs-charities-parser.ts
- Both classified as Central Government (S.1311)
- No deduplication between sources, minimum viable data is name only

## Key Files
- `specs/010-you-can-discover/spec.md` - Groundwork/NHS Charities feature specification
- `specs/010-you-can-discover/plan.md` - Implementation plan
- `specs/010-you-can-discover/contracts/` - Parser contracts
- `src/services/groundwork-parser.ts` - Groundwork Trusts HTML parser (NEW)
- `src/services/nhs-charities-parser.ts` - NHS Charities API parser (NEW)
- `src/services/mappers/groundwork-mapper.ts` - Maps to Organisation (NEW)
- `src/services/mappers/nhs-charities-mapper.ts` - Maps to Organisation (NEW)

## Development Notes
- HTML scraping using cheerio for webpage parsing
- API discovery pattern: Extract endpoint from webpage JavaScript
- Storepoint API for NHS Charities location data
- Retry logic with exponential backoff for resilience
- Fail-fast approach after retries exhausted

## Recent Changes
- Branch 010-you-can-discover: Adding Groundwork Trusts and NHS Charities
- HTML dropdown scraping for Groundwork, API discovery for NHS Charities
- Branch 009-english-courts-can: Added UK Courts and Tribunals (~863)
- Branch 008-ni-schools-you: Added Northern Ireland Schools (~1122)
- Branch 007-we-re-already: Added UK Colleges (Scotland, Wales, NI)

---
*Auto-generated context for AI assistants. Keep under 150 lines.*