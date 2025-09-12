# Research Findings: UK Public Sector Organisation Aggregator

## Technical Stack Decisions

### TypeScript CLI Setup
**Decision**: TypeScript with tsx for execution, pnpm for package management  
**Rationale**: 
- TypeScript provides type safety for data mapping between heterogeneous sources
- tsx allows direct TypeScript execution without build step during development
- pnpm offers efficient dependency management with minimal disk space usage
**Alternatives considered**: 
- Plain Node.js (rejected: lack of type safety for complex data transformations)
- ts-node (rejected: tsx is faster and more modern)
- npm/yarn (rejected: pnpm more efficient for minimal dependencies approach)

### HTTP Client
**Decision**: axios for HTTP requests  
**Rationale**:
- Mature, well-tested library
- Built-in request/response interceptors for error handling
- Automatic JSON transformation
- Retry capabilities for unreliable endpoints
**Alternatives considered**:
- node-fetch (rejected: less features, requires more boilerplate)
- native fetch (rejected: not available in all Node versions)
- got (rejected: heavier dependency)

### Excel Parsing
**Decision**: xlsx (SheetJS) library  
**Rationale**:
- Industry standard for Excel parsing in Node.js
- Supports both .xlsx and older formats
- Can handle large files efficiently with streaming
- Direct access to specific sheets by name
**Alternatives considered**:
- exceljs (rejected: heavier, more features than needed)
- node-xlsx (rejected: wrapper around xlsx, adds no value)
- csv-parse (rejected: doesn't handle Excel format)

### Testing Framework
**Decision**: Jest with ts-jest  
**Rationale**:
- Built-in coverage reporting (80% requirement)
- Excellent TypeScript support via ts-jest
- Mocking capabilities for external APIs
- Parallel test execution
**Alternatives considered**:
- Mocha + Chai (rejected: requires multiple libraries)
- Vitest (rejected: less mature, less ecosystem support)
- Node test runner (rejected: limited features)

### Project Structure
**Decision**: Modular service architecture  
**Rationale**:
- Clear separation of concerns
- Each module independently testable
- Follows single responsibility principle
- Easy to mock for testing
**Alternatives considered**:
- Monolithic script (rejected: hard to test, maintain)
- Class-based OOP (rejected: unnecessary complexity)
- Functional programming only (rejected: harder to organize)

## Data Processing Strategies

### Deduplication Strategy
**Decision**: Multi-field matching with configurable weights  
**Rationale**:
- Organisation names may vary slightly across sources
- Use combination of name similarity + identifiers
- Track all source occurrences for provenance
**Implementation approach**:
1. Normalize organisation names (lowercase, remove special chars)
2. Use exact ID matching where available
3. Fuzzy match on names with 90%+ similarity threshold
4. Manual review flagging for ambiguous matches

### Field Mapping Strategy
**Decision**: Configuration-driven mapping with fallbacks  
**Rationale**:
- Explicit mapping rules in configuration
- Preserve unmapped fields for future reconciliation
- Type coercion with validation
**Implementation approach**:
1. Define mapping configuration object
2. Apply transformations in order
3. Validate transformed data
4. Include original fields in metadata

### Error Handling Strategy
**Decision**: Fail-safe with comprehensive logging  
**Rationale**:
- Continue processing despite individual record failures
- Log all errors with context for debugging
- Produce partial output rather than complete failure
**Implementation approach**:
1. Try-catch around each record processing
2. Collect errors in separate error log
3. Include error summary in output metadata
4. Return non-zero exit code if errors occurred

## Performance Considerations

### Memory Management
**Decision**: Stream processing where possible  
**Rationale**:
- 100k+ records could exceed memory limits if loaded at once
- Process in chunks of 1000 records
- Use generators for iteration
**Implementation approach**:
1. Stream JSON parsing for large API responses
2. Row-by-row Excel processing
3. Incremental output writing

### Caching Strategy
**Decision**: File-based caching for development  
**Rationale**:
- Avoid repeated API calls during development
- Cache downloaded Excel files
- Invalidate based on timestamp
**Implementation approach**:
1. Cache directory with timestamp-based files
2. Command-line flag to force refresh
3. Automatic cache cleanup after 24 hours

## External Dependencies

### Minimal Dependencies Approach
**Decision**: Core dependencies only  
**Rationale**: As specified in requirements
**Final dependency list**:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "xlsx": "^0.18.5",
    "commander": "^11.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

## Command Line Interface

### CLI Design
**Decision**: commander.js for CLI parsing  
**Rationale**:
- Declarative API for command definition
- Automatic help generation
- Built-in option parsing
**Commands structure**:
```
pnpm run compile          # Main execution
pnpm run compile --cache  # Use cached data
pnpm run compile --debug  # Verbose logging
pnpm run test            # Run test suite
pnpm run coverage        # Generate coverage report
```

## Development Workflow

### Build Process
**Decision**: Direct tsx execution with tsc for production  
**Rationale**:
- Fast development iteration with tsx
- Type-checked production build with tsc
- No bundling needed for CLI tool
**Scripts**:
```json
{
  "scripts": {
    "compile": "tsx src/cli/index.ts",
    "build": "tsc",
    "test": "jest",
    "coverage": "jest --coverage",
    "lint": "tsc --noEmit"
  }
}
```

## All Technical Decisions Resolved
✅ No remaining NEEDS CLARIFICATION items
✅ All technology choices documented
✅ Implementation approach defined
✅ Ready for Phase 1 design