# Claude Code Context

## Project Overview
UK Public Sector Organisation Aggregator - A TypeScript CLI tool that aggregates organisation data from multiple government sources into a unified JSON format.

## Tech Stack
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+ with tsx
- **Package Manager**: pnpm
- **Testing**: Jest with ts-jest (80% coverage required)
- **Key Dependencies**: axios, xlsx, commander (minimal dependencies policy)

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
Fixing aggregator to return correct organization counts:
- GOV.UK API: Should return 611 (currently 0)
- ONS Institutional Units: Should return 3360 (currently 0)
- ONS Non-Institutional Units: Should return 57 (currently 0)

## Key Files
- `specs/002-the-current-implementation/spec.md` - Fix specification
- `specs/002-the-current-implementation/plan.md` - Implementation plan
- `specs/002-the-current-implementation/research.md` - Root cause analysis
- `src/services/fetcher.ts` - Needs pagination fix for GOV.UK
- `src/services/parser.ts` - Needs sheet name matching fix

## Development Notes
- Issue: API pagination using wrong field names
- Issue: Excel sheet pattern matching too strict
- Issue: ONS scraper finding old .xls instead of .xlsx
- Solution: Fix pagination, update sheet patterns, improve scraping

## Recent Changes
- Branch 002-the-current-implementation: Fixing count discrepancies
- Identified root causes in fetcher and parser services
- Created contracts for expected data counts

---
*Auto-generated context for AI assistants. Keep under 150 lines.*