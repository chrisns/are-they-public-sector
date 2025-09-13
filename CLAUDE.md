# Claude Code Context

## Project Overview
UK Public Sector Organisation Aggregator - A TypeScript CLI tool that aggregates organisation data from multiple government sources into a unified JSON format.

## Tech Stack
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+ with tsx
- **Package Manager**: pnpm
- **Testing**: Jest with ts-jest (80% coverage required)
- **Key Dependencies**: axios, xlsx, commander, cheerio (minimal dependencies policy)

## Commands
```bash
pnpm install          # Install dependencies
pnpm run compile      # Execute aggregator (tsx src/cli/index.ts)
pnpm test            # Run all tests
pnpm run coverage    # Generate coverage report
pnpm run lint        # Type check with tsc --noEmit
```

## Project Structure
```
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
Adding NHS Trusts and Local Authorities data sources:
- NHS Provider Directory: ~215 trusts (HTML scraping with cheerio)
- DEFRA UK-AIR Local Authorities: ~408 authorities (HTML scraping)
- New parsers: nhs-parser.ts, local-authority-parser.ts
- Fail-fast on source unavailability or format changes

## Key Files
- `specs/004-you-can-pull/spec.md` - NHS/LA feature specification
- `specs/004-you-can-pull/plan.md` - Implementation plan
- `specs/004-you-can-pull/contracts/` - Parser contracts
- `src/services/nhs-parser.ts` - NHS Trust HTML parser (NEW)
- `src/services/local-authority-parser.ts` - LA HTML parser (NEW)

## Development Notes
- HTML scraping using cheerio for jQuery-like API
- Fail-fast approach for nightly runs
- Foundation Trusts identified by "Foundation" in name
- Local Authority types inferred from council name patterns

## Recent Changes
- Branch 004-you-can-pull: Adding NHS Trusts and Local Authorities
- Created HTML parsers with cheerio for new data sources
- Implemented fail-fast error handling for format changes

---
*Auto-generated context for AI assistants. Keep under 150 lines.*