# Quickstart: UK Colleges Feature

## Prerequisites
- Node.js 18+
- pnpm installed
- Network access to aoc.co.uk

## Setup
```bash
# Install dependencies (including new pdf-parse)
pnpm install

# Run tests to verify setup
pnpm test colleges-parser.contract
```

## Running the Colleges Aggregation

### Option 1: Colleges Only
```bash
# Aggregate only UK colleges (Scotland, Wales, NI)
pnpm run compile -- --source colleges-uk
```

Expected output:
```
🎯 Starting UK Colleges Aggregation
📥 Fetching AoC webpage...
✅ Found PDF links for 3 regions
📄 Downloading Scotland PDF...
✅ Parsed 26 colleges from Scotland
📄 Downloading Wales PDF...
✅ Parsed 13 colleges from Wales
📄 Downloading Northern Ireland PDF...
✅ Parsed 6 colleges from Northern Ireland
✅ Count validation passed
✅ Aggregated 45 UK colleges successfully
```

### Option 2: Full Aggregation (Including Colleges)
```bash
# Run complete aggregation with all sources
pnpm run compile
```

The colleges will be included in the complete output file.

## Verification

### 1. Check Output File
```bash
# View colleges in output
cat data/output/organisations.json | jq '.[] | select(.type == "college")'
```

### 2. Verify Counts
```bash
# Count colleges by region
cat data/output/organisations.json | jq '[.[] | select(.type == "college")] | group_by(.metadata.region) | map({region: .[0].metadata.region, count: length})'
```

Expected result:
```json
[
  {"region": "Scotland", "count": 26},
  {"region": "Wales", "count": 13},
  {"region": "Northern Ireland", "count": 6}
]
```

### 3. Run Integration Tests
```bash
# Run the integration test
pnpm test colleges-aggregation.integration
```

## Troubleshooting

### PDF Download Fails
- Check network connectivity
- Verify aoc.co.uk is accessible
- Check for rate limiting (wait and retry)

### Count Mismatch Error
- The webpage count may have been updated
- Check the AoC webpage manually
- Update test mocks if legitimate change

### PDF Parse Error
- PDF format may have changed
- Check PDF manually for structure changes
- Update parser if needed

## Manual Validation
1. Visit https://www.aoc.co.uk/about/list-of-colleges-in-the-uk
2. Note the displayed counts for each region
3. Download each PDF manually
4. Count entries in each PDF
5. Compare with aggregator output

## Development Workflow

### Adding Test Data
```bash
# Save webpage for testing
curl https://www.aoc.co.uk/about/list-of-colleges-in-the-uk > tests/mocks/aoc-webpage.html

# Download sample PDFs for testing
# Save to tests/mocks/[region]-colleges.pdf
```

### Running in Debug Mode
```bash
# Enable detailed logging
DEBUG=colleges:* pnpm run compile -- --source colleges-uk
```

## Performance Expectations
- Total execution time: <30 seconds
- Webpage fetch: <2 seconds
- Each PDF download: <5 seconds
- PDF parsing: <2 seconds per file
- Memory usage: <100MB

## CI/CD Integration
The colleges aggregation is included in the nightly build:
- Runs at 2 AM UTC
- Fails fast on any error
- Sends alerts on validation failures
- Retries up to 3 times on network errors