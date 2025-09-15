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
Adding UK Colleges (Scotland, Wales, Northern Ireland):
- AoC webpage: Dynamic PDF links (must fetch first)
- PDF parsing: Extract college names from tables
- Validation: Count must match webpage display
- New parser: colleges-parser.ts with pdf-parse
- Fail-fast on webpage/PDF format changes

## Key Files
- `specs/007-we-re-already/spec.md` - UK Colleges feature specification
- `specs/007-we-re-already/plan.md` - Implementation plan
- `specs/007-we-re-already/contracts/` - Parser contracts
- `src/services/colleges-parser.ts` - Colleges PDF parser (NEW)
- `src/services/mappers/colleges-mapper.ts` - Maps to Organisation (NEW)

## Development Notes
- HTML scraping using cheerio for webpage parsing
- PDF parsing using pdf-parse for table extraction
- Dynamic PDF URLs require fetching webpage first
- Count validation ensures data integrity
- Fail-fast approach for nightly runs

## Recent Changes
- Branch 007-we-re-already: Adding UK Colleges (Scotland, Wales, NI)
- Integrated pdf-parse for PDF table extraction
- Added count validation between webpage and PDFs
- Branch 006-you-can-find: Added emergency services (Police, Fire)
- Branch 004-you-can-pull: Added NHS Trusts and Local Authorities

---
*Auto-generated context for AI assistants. Keep under 150 lines.*