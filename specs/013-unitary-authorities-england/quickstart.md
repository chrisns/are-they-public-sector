# Quickstart: UK Government Organisation Data Sources

## Prerequisites
- Node.js 18+
- pnpm installed
- Internet connection for fetching data

## Installation
```bash
# Install dependencies
pnpm install

# Run type checking
pnpm run lint
```

## Quick Test - Single Source

Test a single data source to verify it's working:

```bash
# Test English Unitary Authorities (ONS)
tsx src/services/fetchers/english-unitary-authorities-fetcher.ts

# Expected output:
# Fetching ONS page...
# Extracted CSV URL: https://www.ons.gov.uk/file?uri=/.../unitary_authorities.csv
# Fetching CSV data...
# Found 59 unitary authorities
```

## Run All Sources

Execute the full aggregation:

```bash
# Run the aggregator
pnpm run compile

# This will:
# 1. Fetch data from all 12 sources
# 2. Parse HTML/CSV as appropriate
# 3. Map to Organisation format
# 4. Deduplicate entries
# 5. Output to organisations.json
```

## Verify Output

Check the generated JSON file:

```bash
# Count organisations by type
cat organisations.json | jq '[.[] | .type] | group_by(.) | map({type: .[0], count: length})'

# Expected types and approximate counts:
# - unitary_authority: ~80
# - district_council: ~164
# - health_board: ~14
# - integrated_care_board: ~42
# - local_healthwatch: ~150
# - regional_transport_partnership: 7
# - research_council: 9
# - national_park_authority: ~10
# - trust_port: 3
# - government_department: ~9

# Check regional distribution
cat organisations.json | jq '[.[] | .region] | group_by(.) | map({region: .[0], count: length})'
```

## Test Specific Features

### Test Dynamic CSV Link (ONS)
```bash
# The ONS fetcher should handle dynamic links
tsx -e "
import { EnglishUnitaryAuthoritiesFetcher } from './src/services/fetchers/english-unitary-authorities-fetcher';
const fetcher = new EnglishUnitaryAuthoritiesFetcher();
fetcher.fetch().then(r => console.log('Dynamic URL:', r.metadata?.dynamicUrl));
"
```

### Test Pagination (Healthwatch)
```bash
# The Healthwatch fetcher should process all pages
tsx -e "
import { LocalHealthwatchFetcher } from './src/services/fetchers/local-healthwatch-fetcher';
const fetcher = new LocalHealthwatchFetcher();
fetcher.fetch().then(r => console.log('Pages processed:', r.metadata?.pagesProcessed));
"
```

### Test Welsh Character Handling
```bash
# Check Welsh names are preserved correctly
cat organisations.json | jq '.[] | select(.region == "Wales") | .name' | head -5
```

## Run Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test contract/
pnpm test integration/
pnpm test unit/

# Run with coverage
pnpm run coverage
```

## Troubleshooting

### Source Unavailable
If a source is temporarily unavailable:
```bash
# Check the logs for retry attempts
# The system will retry 3 times with exponential backoff
# Partial results will still be generated
```

### Selector Changes
If HTML structure has changed:
```bash
# Run contract tests to identify which sources are failing
pnpm test contract/

# Update selectors in the relevant fetcher
# Re-run tests to verify fix
```

### Encoding Issues
If special characters appear corrupted:
```bash
# Verify UTF-8 handling
file organisations.json
# Should show: UTF-8 Unicode text

# Check specific entries
cat organisations.json | jq '.[] | select(.name | contains("â") or contains("ô"))'
```

## Performance Check

```bash
# Time the full aggregation
time pnpm run compile

# Expected: Under 30 seconds for all sources
# Actual time depends on network speed
```

## Integration Test

Run the full integration test to verify everything works together:

```bash
# This will test the complete pipeline
pnpm test tests/integration/uk-gov-organisations-pipeline.test.ts

# Expected: All 12 sources fetched and aggregated successfully
```

## Manual Verification

1. **Check Organisation Count**
   - Total should be approximately 600-700 organisations

2. **Verify No Duplicates**
   - Each organisation should have a unique ID
   - Similar names from different sources should be deduplicated

3. **Validate Regional Classification**
   - English organisations marked as "England"
   - Scottish as "Scotland", etc.

4. **Confirm Source Attribution**
   - Each organisation should have a `source` field

## Next Steps

After verification:
1. Review the generated `organisations.json`
2. Check logs for any warnings or errors
3. Run the full test suite
4. Commit changes if all tests pass

## Support

If you encounter issues:
1. Check error logs in console output
2. Verify network connectivity
3. Ensure all dependencies are installed
4. Check source websites are accessible
5. Review contract test failures for specific sources