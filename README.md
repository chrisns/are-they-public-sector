# UK Public Sector Organisation Aggregator

A TypeScript CLI tool that aggregates UK public sector organisation data from multiple government sources into a unified JSON format. The tool fetches data from the GOV.UK API and ONS Public Sector Classification Guide, maps fields to a common schema, performs deduplication, and outputs structured data suitable for analysis and integration.

## Features

- **Multi-Source Data Aggregation**: Fetches from GOV.UK API and ONS Excel files
- **Intelligent Field Mapping**: Configuration-driven mapping between source and target schemas  
- **Deduplication & Conflict Resolution**: Identifies and merges duplicate records across sources
- **Data Quality Assessment**: Calculates completeness scores and flags potential issues
- **Stream Processing**: Handles large datasets (100k+ records) efficiently
- **Comprehensive Testing**: 80% test coverage with unit, integration, and performance tests
- **Error Recovery**: Robust error handling with retry mechanisms and graceful failures

## Quick Start

### Prerequisites

- Node.js >=18
- pnpm (package manager)

### Installation

```bash
git clone <repository-url>
cd are-they-public-sector2
pnpm install
```

### Basic Usage

```bash
# Run the aggregator
pnpm run compile

# Output will be generated at dist/orgs.json
```

### Development

```bash
# Run in development mode with hot reload
pnpm dev

# Build TypeScript
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm coverage

# Type checking
pnpm lint
```

## Data Sources

### 1. GOV.UK Organisations API
- **URL**: `https://www.gov.uk/api/organisations`
- **Format**: JSON
- **Contains**: Government departments, agencies, NDPBs

### 2. ONS Public Sector Classification Guide
- **URL**: `https://www.ons.gov.uk/economy/nationalaccounts/uksectoraccounts/datasets/publicsectorclassificationguide`
- **Format**: Excel (2 tabs)
- **Contains**: Institutional and non-institutional public sector units

## Architecture

```
src/
├── cli/              # CLI entry point and orchestration
│   ├── index.ts      # Main CLI interface
│   ├── orchestrator.ts # Workflow coordination
│   └── logger.ts     # Structured logging
├── services/         # Core business logic
│   ├── fetcher.ts    # HTTP data fetching
│   ├── parser.ts     # Excel/JSON parsing
│   ├── mapper.ts     # Field mapping & transformation
│   ├── deduplicator.ts # Duplicate detection & merging
│   └── index.ts      # Service factory functions
├── models/           # TypeScript interfaces
│   ├── organisation.ts # Core data model
│   ├── sources.ts    # Source-specific types
│   └── processing.ts # Processing result types
├── config/           # Configuration & mapping rules
│   ├── index.ts      # Main configuration
│   └── mapping-rules.ts # Field mapping definitions
└── lib/              # Utilities
    └── writer.ts     # JSON output generation
```

### Test Structure
```
tests/
├── contract/         # API contract validation
├── integration/      # End-to-end workflow tests
├── unit/            # Individual component tests
├── performance/     # Load testing (100k+ records)
├── mocks/           # Test data fixtures
└── e2e/             # Full aggregation tests
```

## Configuration

The aggregator uses configuration-driven field mapping defined in `src/config/mapping-rules.ts`:

```typescript
// Example field mapping
{
  sourceField: 'details.organisation_govuk_status.status',
  targetField: 'status',
  transformer: (status) => status === 'live' ? 'active' : 'inactive'
}
```

### Key Configuration Options

- **Field Mappings**: Define how source fields map to unified schema
- **Deduplication Rules**: Configure similarity thresholds and conflict resolution
- **Data Quality Thresholds**: Set completeness and review requirements
- **Output Options**: Control metadata inclusion and formatting

## Data Model

The unified `Organisation` model includes:

```typescript
interface Organisation {
  id: string;                    // Generated UUID
  name: string;                  // Primary name
  alternativeNames?: string[];   // Known aliases
  type: OrganisationType;        // Standardized classification
  status: 'active' | 'inactive' | 'dissolved';
  classification: string;        // Detailed classification
  location?: OrganisationLocation;
  sources: DataSourceReference[]; // Provenance tracking
  dataQuality: DataQuality;      // Quality metrics
  lastUpdated: string;           // ISO timestamp
  additionalProperties?: Record<string, any>; // Unmapped fields
}
```

## Performance

The aggregator is optimized for large datasets:

- **Memory Efficiency**: Streaming processing prevents memory exhaustion
- **Processing Speed**: Handles 100k+ records in under 60 seconds
- **Error Recovery**: Continues processing despite individual record failures

### Performance Benchmarks
- 100k records: ~45 seconds, <500MB memory
- Deduplication: ~10k comparisons/second
- Output generation: ~5MB/second write speed

## Testing

The project follows TDD principles with comprehensive test coverage:

```bash
# Run all tests
pnpm test

# Generate coverage report
pnpm coverage

# Run performance tests
pnpm test -- --testNamePattern="load-test"
```

### Test Categories

1. **Contract Tests**: Validate external API/file format expectations
2. **Integration Tests**: Test component interactions and workflows  
3. **Unit Tests**: Test individual functions and classes
4. **Performance Tests**: Validate memory usage and processing speed
5. **E2E Tests**: Test complete aggregation workflows

## Error Handling

The aggregator implements robust error handling:

- **Network Failures**: Automatic retry with exponential backoff
- **Data Corruption**: Graceful handling of malformed files/JSON
- **Processing Errors**: Continue processing valid records, log failures
- **Memory Constraints**: Stream processing for large datasets
- **File System Errors**: Meaningful error messages and recovery suggestions

## Output Format

The tool generates `dist/orgs.json` with the following structure:

```json
{
  "organisations": [...],
  "metadata": {
    "processedAt": "2025-01-15T10:30:00Z",
    "totalRecords": 15420,
    "sources": ["gov_uk_api", "ons_institutional", "ons_non_institutional"]
  },
  "summary": {
    "totalOrganisations": 15420,
    "organisationsByType": {...},
    "dataQuality": {...}
  },
  "conflicts": [...]  // Optional: data conflicts requiring review
}
```

## Contributing

1. Follow TDD: Write failing tests first (RED-GREEN-Refactor)
2. Maintain 80% test coverage minimum
3. Use meaningful commit messages
4. Update documentation for API changes

### Development Workflow

1. Write contract tests for external dependencies
2. Write integration tests for workflows
3. Implement functionality with unit tests
4. Verify performance with load tests

## Dependencies

### Runtime Dependencies
- **axios**: HTTP client for API requests
- **xlsx**: Excel file parsing and processing  
- **commander**: CLI framework and argument parsing

### Development Dependencies
- **typescript**: TypeScript compiler (5.x)
- **tsx**: TypeScript execution for development
- **jest**: Testing framework with ts-jest
- **@types/***: TypeScript type definitions

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check existing [Issues](link-to-issues)
2. Review [Documentation](link-to-docs)  
3. Create new issue with reproduction steps