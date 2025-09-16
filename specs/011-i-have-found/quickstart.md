# Quickstart: GIAS CSV Download Implementation

## Prerequisites
- Node.js 18+ installed
- TypeScript 5.x configured
- Network access to get-information-schools.service.gov.uk

## Quick Test
```bash
# 1. Run the contract tests (should fail initially)
npm test -- tests/contract/gias-csv-fetcher.contract.test.ts

# 2. Implement the service
# (Follow TDD - make tests pass one by one)

# 3. Run integration test
npm test -- tests/integration/gias-csv.integration.test.ts

# 4. Test with orchestrator
npm run compile -- --source schools

# 5. Verify output
jq '.organisations[] | select(.additionalProperties.source == "gias") | .name' dist/orgs.json | head -10
```

## Manual Verification

### 1. Test Direct Service
```typescript
// test-gias-fetcher.ts
import { GIASCSVFetcher } from './src/services/gias-csv-fetcher';

async function test() {
  const fetcher = new GIASCSVFetcher();
  console.time('GIAS Fetch');

  try {
    const schools = await fetcher.fetch();
    console.timeEnd('GIAS Fetch');

    console.log(`✓ Fetched ${schools.length} schools`);
    console.log(`✓ First school: ${schools[0].EstablishmentName}`);
    console.log(`✓ Sample URN: ${schools[0].URN}`);

    // Verify data quality
    const withPostcode = schools.filter(s => s.Postcode).length;
    const openSchools = schools.filter(s => s.EstablishmentStatus === 'Open').length;

    console.log(`✓ Schools with postcode: ${withPostcode}`);
    console.log(`✓ Open schools: ${openSchools}`);
  } catch (error) {
    console.error('✗ Failed:', error);
  }
}

test();
```

Run: `npx tsx test-gias-fetcher.ts`

### 2. Performance Benchmark
```bash
# Time the old approach (before changes)
time npm run compile -- --source schools > /tmp/old-timing.txt

# Time the new approach (after implementation)
time npm run compile -- --source schools > /tmp/new-timing.txt

# Compare
echo "Old approach:"
grep "Fetched.*schools" /tmp/old-timing.txt
echo "New approach:"
grep "Fetched.*schools" /tmp/new-timing.txt
```

### 3. Data Validation
```bash
# Extract and validate CSV data
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('dist/orgs.json', 'utf8'));
const schools = data.organisations.filter(o => o.classification === 'School');

console.log('School Statistics:');
console.log('Total schools:', schools.length);
console.log('With postcode:', schools.filter(s => s.location?.postalCode).length);
console.log('With website:', schools.filter(s => s.website).length);
console.log('Unique LAs:', new Set(schools.map(s => s.additionalProperties?.localAuthority)).size);
"
```

## Expected Results

### Performance
- **Target**: Under 30 seconds
- **Expected**: 10-20 seconds typical
- **Old method**: 3-5 minutes

### Data Completeness
- **Total schools**: ~52,000
- **Open schools**: ~32,000
- **With postcodes**: >95%
- **With websites**: >70%

### Memory Usage
- **Peak**: ~500MB during CSV parsing
- **Steady**: ~200MB after mapping

## Troubleshooting

### Common Issues

#### 403 Forbidden
```
Error: Failed to fetch: 403 Forbidden
```
**Solution**: Check User-Agent header is browser-like

#### CSRF Token Missing
```
Error: No CSRF token found
```
**Solution**: Verify initial GET request includes all headers

#### Timeout
```
Error: File generation timeout
```
**Solution**: Increase polling timeout (rare, usually server issue)

#### ZIP Extraction Failed
```
Error: Invalid ZIP file
```
**Solution**: Check download completed fully, verify file size

### Debug Mode
```typescript
// Enable detailed logging
const fetcher = new GIASCSVFetcher({ debug: true });

// Or set environment variable
GIAS_DEBUG=true npm run compile
```

### Network Inspection
```bash
# Monitor requests (requires mitmproxy)
mitmdump -s log_requests.py &
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run compile

# Check request headers
curl -I https://get-information-schools.service.gov.uk/Downloads
```

## Integration Checklist

- [ ] Contract tests pass
- [ ] Integration tests pass
- [ ] Performance under 30 seconds
- [ ] ~52,000 schools fetched
- [ ] Old JSON scraping removed
- [ ] Orchestrator updated
- [ ] Error messages clear
- [ ] Logging appropriate
- [ ] Documentation updated

## Next Steps

1. **Remove old code**:
   - Delete `src/services/schools-fetcher.ts`
   - Remove JSON scraping from orchestrator
   - Delete old test files

2. **Update mapper**:
   - Adapt `schools-mapper.ts` for CSV fields
   - Handle new field names
   - Preserve all data

3. **Update orchestrator**:
   ```typescript
   // Old
   const schools = await this.schoolsFetcher.fetchFromJSON();

   // New
   const schools = await this.giasCSVFetcher.fetch();
   ```

4. **Run full test suite**:
   ```bash
   npm test
   npm run coverage
   ```

5. **Verify output**:
   ```bash
   npm run compile
   ls -lh dist/orgs.json
   ```

## Success Criteria

✅ All tests passing
✅ Performance < 30 seconds
✅ ~52,000 schools in output
✅ No JSON scraping code remains
✅ Error handling robust
✅ Logs show clear progress
✅ Memory usage acceptable
✅ Output format unchanged