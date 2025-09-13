# Quickstart: Schools Data Aggregation

## Prerequisites
- Node.js 18+
- pnpm installed
- Network connection for API access

## Setup
```bash
# Install dependencies
pnpm install

# Run tests to verify setup
pnpm test
```

## Quick Test: Fetch First Page
```bash
# Test fetching a single page of schools
tsx -e "
import { SchoolsParser } from './src/services/schools-parser.js';
const parser = new SchoolsParser();
const result = await parser.fetchPage(0);
console.log(\`Fetched \${result.schools.length} schools\`);
console.log(\`Has more pages: \${result.hasMore}\`);
console.log(\`Sample school:\`, result.schools[0]);
"
```

## Full Aggregation
```bash
# Run the full aggregation
pnpm run compile

# Check the output
ls -la data/orgs.json
jq '.schools | length' data/orgs.json
```

## Validation Steps

### 1. Verify School Data Structure
```bash
# Check first school has all required fields
jq '.schools[0]' data/orgs.json
```

Expected output:
```json
{
  "urn": 100000,
  "name": "St Marylebone Church of England School",
  "status": "Open",
  "phaseType": "Secondary, Voluntary aided school",
  "localAuthority": "Westminster",
  "laestab": "213/4600",
  "address": "64 Marylebone High Street, London, W1U 5BA",
  "latitude": 51.5209,
  "longitude": -0.1517
}
```

### 2. Verify Only Open Schools
```bash
# Check all schools have status "Open"
jq '.schools | map(select(.status != "Open")) | length' data/orgs.json
# Should output: 0
```

### 3. Verify Deduplication
```bash
# Check for unique URNs
jq '.schools | map(.urn) | unique | length' data/orgs.json
# Should equal total count
jq '.schools | length' data/orgs.json
```

### 4. Verify Metadata
```bash
# Check metadata is present
jq '.metadata' data/orgs.json
```

## Performance Expectations
- First page: ~2 seconds
- Full aggregation: 5-10 minutes
- Total schools: ~30,000
- File size: ~15-20 MB

## Troubleshooting

### Network Errors
If you see network errors:
1. Check internet connection
2. Verify GIAS service is up: https://get-information-schools.service.gov.uk
3. Check for rate limiting (wait and retry)

### Missing Data
If school count is low:
1. Check search term in options
2. Verify status filter is working
3. Check logs for parsing errors

### Test Failures
If tests fail:
1. Run `pnpm test -- --verbose`
2. Check for API format changes
3. Verify mock data matches current API

## Integration Testing
```bash
# Run integration tests with live API
pnpm test tests/integration/schools-aggregation.integration.test.ts

# Run contract tests
pnpm test tests/contract/schools-parser.contract.test.ts
```

## Manual Verification
```bash
# Count schools by local authority
jq '.schools | group_by(.localAuthority) | map({authority: .[0].localAuthority, count: length}) | sort_by(.count) | reverse | .[0:5]' data/orgs.json

# Find schools by name pattern
jq '.schools | map(select(.name | contains("Academy"))) | length' data/orgs.json
```

## Success Criteria
✅ All tests pass (100% pass rate)  
✅ Code coverage ≥ 80%  
✅ No linting errors  
✅ ~30,000 schools aggregated  
✅ Only "Open" schools included  
✅ No duplicate URNs  
✅ Metadata includes source and timestamp