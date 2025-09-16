# Quick Start: UK Courts and Tribunals Integration

## Overview
This feature integrates court and tribunal data from all UK jurisdictions into the aggregation system.

## Prerequisites
- Node.js 18+
- TypeScript 5.x
- pnpm package manager
- Network access to data sources

## Installation
```bash
# Install dependencies
pnpm install

# Build the project
pnpm run compile
```

## Testing the Integration

### 1. Run Contract Tests (TDD - These should fail initially)
```bash
# Test English Courts CSV parser
pnpm test english-courts-parser.contract

# Test NI Courts HTML parser
pnpm test ni-courts-parser.contract

# Test Scottish Courts parser
pnpm test scottish-courts-parser.contract

# Test Courts to Organisation mapper
pnpm test courts-mapper.contract
```

### 2. Test Individual Parsers
```bash
# Test English Courts parser
npx tsx src/services/english-courts-parser.ts

# Test NI Courts parser
npx tsx src/services/ni-courts-parser.ts

# Test Scottish Courts parser
npx tsx src/services/scottish-courts-parser.ts
```

### 3. Run Integration Test
```bash
# Full courts integration test
pnpm test courts.integration

# Or run via orchestrator
npx tsx src/cli/index.ts --source courts
```

## Verification Steps

### Step 1: Verify English Courts Data
```bash
# Fetch and display English courts
npx tsx -e "
import { EnglishCourtsParser } from './src/services/english-courts-parser.js';
const parser = new EnglishCourtsParser();
const courts = await parser.parse();
console.log('English/Welsh courts found:', courts.length);
console.log('Sample:', courts.slice(0, 3).map(c => c.name));
"
```

Expected output:
- 300+ courts from England and Wales
- Mix of Crown, County, Magistrates' Courts and Tribunals
- Both active and inactive courts included

### Step 2: Verify Northern Ireland Courts
```bash
# Fetch and display NI courts
npx tsx -e "
import { NICourtsParser } from './src/services/ni-courts-parser.js';
const parser = new NICourtsParser();
const courts = await parser.parse();
console.log('NI courts found:', courts.length);
console.log('Courts:', courts.map(c => c.name));
"
```

Expected output:
- 20-30 courts from Northern Ireland
- Courts like Belfast, Antrim, Londonderry
- All assumed to be active

### Step 3: Verify Scottish Courts
```bash
# Attempt to fetch Scottish courts
npx tsx -e "
import { ScottishCourtsParser } from './src/services/scottish-courts-parser.js';
const parser = new ScottishCourtsParser();
const courts = await parser.parse();
if (courts.length > 0) {
  console.log('Scottish courts found:', courts.length);
  console.log('Sample:', courts.slice(0, 3).map(c => c.name));
} else {
  console.log('Scottish courts unavailable - using fallback data');
  console.log('Fallback courts:', parser.getFallbackData().length);
}
"
```

Expected output:
- Either 50+ Scottish courts from API
- Or fallback data with major Scottish courts
- Sheriff Courts, JP Courts, Court of Session

### Step 4: Verify Mapping to Organisation Model
```bash
# Test mapping to Organisation format
npx tsx -e "
import { EnglishCourtsParser } from './src/services/english-courts-parser.js';
import { CourtsMapper } from './src/services/mappers/courts-mapper.js';

const parser = new EnglishCourtsParser();
const mapper = new CourtsMapper();

const rawCourts = await parser.parse();
const courts = parser.mapToCourtModel(rawCourts);
const organisations = mapper.mapMany(courts);

console.log('Organisations created:', organisations.length);
console.log('Sample org:', {
  name: organisations[0].name,
  type: organisations[0].type,
  classification: organisations[0].classification,
  status: organisations[0].status
});
"
```

Expected output:
- Same number of organisations as courts
- Type: 'JUDICIAL_BODY' for all
- Classification: Specific court type
- Status: 'active' or 'inactive'

### Step 5: Full Integration Test
```bash
# Run complete aggregation including courts
npx tsx src/cli/index.ts

# Check output
cat output/organisations.json | jq '.[] | select(.type == "JUDICIAL_BODY") | .name' | head -10
```

Expected output:
- Courts from all three jurisdictions
- Properly formatted Organisation entities
- No deduplication between sources

## Common Issues & Solutions

### Issue: CSV Download Fails
```bash
# Test direct CSV access
curl -I https://factprod.blob.core.windows.net/csv/courts-and-tribunals-data.csv
```
Solution: Check network connectivity and URL validity

### Issue: NI Courts Page Structure Changed
```bash
# Verify HTML structure
curl https://www.nidirect.gov.uk/contacts/northern-ireland-courts-and-tribunals-service | grep -o '<a href="/node/[0-9]*">[^<]*</a>' | head -5
```
Solution: Update HTML parsing selectors in ni-courts-parser.ts

### Issue: Scottish Courts Inaccessible
```bash
# Check fallback data
npx tsx -e "
import { ScottishCourtsParser } from './src/services/scottish-courts-parser.js';
const parser = new ScottishCourtsParser();
console.log('Fallback courts available:', parser.getFallbackData().length);
"
```
Solution: System will automatically use fallback data

## Performance Expectations
- English CSV parsing: ~2-5 seconds
- NI HTML parsing: ~1-2 seconds
- Scottish courts: ~2-3 seconds (or instant with fallback)
- Total aggregation time: <10 seconds

## Data Validation
```bash
# Validate data completeness
npx tsx -e "
import { validateCourtsData } from './src/lib/validators.js';

const results = await validateCourtsData();
console.log('Validation results:', results);
"
```

Expected validations:
- All courts have names
- Active/inactive status properly set
- Location data parsed where available
- No deduplication performed (FR-020)

## Monitoring
```bash
# Check logs for any warnings
grep WARN logs/courts-parser.log

# Check for fallback usage
grep "Using fallback" logs/scottish-courts.log
```

## Success Criteria
✅ English/Welsh courts CSV successfully parsed
✅ Northern Ireland courts extracted from HTML
✅ Scottish courts retrieved or fallback used
✅ All courts mapped to Organisation model
✅ No deduplication between sources
✅ Integration completes in <30 seconds

## Support
For issues with data sources:
- English/Welsh: Check CSV URL is accessible
- Northern Ireland: Verify HTML structure hasn't changed
- Scotland: Contact enquiries@scotcourts.gov.uk for API access