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
Implementing data aggregation from:
1. GOV.UK API (JSON)
2. ONS Public Sector Classification Guide (Excel with 2 tabs)
3. Output to dist/orgs.json

## Key Files
- `specs/001-aggregator-of-data/spec.md` - Feature specification
- `specs/001-aggregator-of-data/plan.md` - Implementation plan
- `specs/001-aggregator-of-data/data-model.md` - Data structures
- `specs/001-aggregator-of-data/contracts/` - API contracts

## Development Notes
- Stream processing for 100k+ records
- Configuration-driven field mapping
- Preserve unmapped fields for future reconciliation
- Flag conflicts for manual review

## Recent Changes
- Initial project setup on branch 001-aggregator-of-data
- Defined data models and contracts
- Planning phase complete, ready for task generation

---
*Auto-generated context for AI assistants. Keep under 150 lines.*