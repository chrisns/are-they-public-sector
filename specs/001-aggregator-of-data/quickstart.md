# Quickstart Guide: UK Public Sector Organisation Aggregator

## Prerequisites

- Node.js 18+ installed
- pnpm package manager installed (`npm install -g pnpm`)
- Internet connection for fetching data sources

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd are-they-public-sector2
git checkout 001-aggregator-of-data
```

2. Install dependencies:
```bash
pnpm install
```

3. Verify installation:
```bash
pnpm run lint
```

## Running the Aggregator

### Basic Usage

Run the aggregator to fetch and compile all UK public sector organisations:

```bash
pnpm run compile
```

This will:
1. Fetch data from GOV.UK API
2. Download the latest ONS Public Sector Classification Guide
3. Parse and map all data sources
4. Deduplicate organisations
5. Output results to `dist/orgs.json`

### Development Mode

For development with cached data (avoids re-downloading):

```bash
pnpm run compile --cache
```

### Debug Mode

For verbose logging to troubleshoot issues:

```bash
pnpm run compile --debug
```

## Testing

### Run All Tests

```bash
pnpm test
```

### Run with Coverage

```bash
pnpm run coverage
```

The project requires 80% test coverage. Coverage report will be generated in `coverage/` directory.

### Run Specific Test Suites

```bash
# Contract tests only
pnpm test -- contract/

# Integration tests only  
pnpm test -- integration/

# Unit tests only
pnpm test -- unit/
```

## Verification Steps

After running the aggregator, verify the output:

1. **Check output file exists:**
```bash
ls -la dist/orgs.json
```

2. **Validate JSON structure:**
```bash
cat dist/orgs.json | jq '.metadata'
```

3. **Check organisation count:**
```bash
cat dist/orgs.json | jq '.metadata.statistics.totalOrganisations'
```

4. **Review any conflicts:**
```bash
cat dist/orgs.json | jq '.conflicts[] | {field, organisationId}'
```

5. **Check for processing errors:**
```bash
cat dist/orgs.json | jq '.errors[]'
```

## Expected Output

The aggregator should produce a JSON file with:
- **Organisations**: Tens of thousands to low hundreds of thousands of records
- **Sources**: Data from 3 sources (GOV.UK API, ONS Institutional Units, ONS Non-Institutional Units)
- **Metadata**: Processing statistics, timestamps, and data quality indicators

Sample output structure:
```json
{
  "organisations": [
    {
      "id": "unique-id",
      "name": "Organisation Name",
      "type": "ministerial_department",
      "status": "active",
      "sources": [...]
    }
  ],
  "metadata": {
    "processedAt": "2025-09-12T10:00:00Z",
    "statistics": {
      "totalOrganisations": 50000,
      "duplicatesFound": 1234,
      "conflictsDetected": 56
    }
  }
}
```

## Common Issues

### Network Timeout
If the ONS Excel download times out:
```bash
pnpm run compile --timeout 60000
```

### Memory Issues
For large datasets, increase Node memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm run compile
```

### Cache Issues
Clear cache if data seems stale:
```bash
rm -rf .cache/
pnpm run compile
```

## Development Workflow

1. **Make changes to source code**
2. **Run type checking:**
   ```bash
   pnpm run lint
   ```
3. **Run tests:**
   ```bash
   pnpm test
   ```
4. **Test the compilation:**
   ```bash
   pnpm run compile --cache
   ```
5. **Check coverage:**
   ```bash
   pnpm run coverage
   ```

## Project Structure

```
src/
├── models/          # TypeScript interfaces and types
├── services/        # Core business logic
│   ├── fetcher.ts   # Data source fetching
│   ├── parser.ts    # Excel and JSON parsing
│   ├── mapper.ts    # Field mapping logic
│   └── deduplicator.ts # Deduplication logic
├── cli/             # Command-line interface
└── lib/             # Utilities and helpers
    └── writer.ts    # JSON output generation

tests/
├── contract/        # API contract tests
├── integration/     # End-to-end tests
├── mocks/          # Mock data for testing
└── unit/           # Unit tests
```

## Next Steps

After successfully running the aggregator:

1. Review the output in `dist/orgs.json`
2. Check for any organisations flagged for review
3. Examine conflicts that need manual resolution
4. Consider implementing additional data sources
5. Set up automated daily runs if needed

## Support

For issues or questions:
- Check the test output for specific errors
- Review logs in debug mode
- Consult the specification in `specs/001-aggregator-of-data/spec.md`