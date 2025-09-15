# Quickstart: Northern Ireland Schools Integration

## Overview
This guide demonstrates the Northern Ireland schools data integration feature, showing how to fetch, parse, and integrate school data from the NI Education Department.

## Prerequisites
- Node.js 18+ installed
- pnpm package manager
- Network access to https://apps.education-ni.gov.uk

## Quick Test

### 1. Run the Integration
```bash
# Install dependencies
pnpm install

# Run the aggregator (includes NI schools)
pnpm run compile

# Check the output
cat output/organisations.json | jq '.[] | select(.category == "Northern Ireland School") | .name' | head -5
```

Expected output:
```
"Abbey Community College"
"Abbots Cross Primary School"
"Academy Primary School"
"Acorn Integrated Primary School"
"Aghavilly Primary School"
```

### 2. Verify School Count
```bash
# Count NI schools in output
cat output/organisations.json | jq '[.[] | select(.category == "Northern Ireland School")] | length'
```

Expected: Approximately 1122 schools (±10%)

### 3. Test Specific School Types
```bash
# List school types
cat output/organisations.json | jq '[.[] | select(.category == "Northern Ireland School") | .subcategory] | unique'
```

Expected output:
```json
[
  "Primary School",
  "Post-Primary School",
  "Special School",
  "Nursery School"
]
```

## Manual Testing

### Test Data Fetching
```bash
# Test the parser directly
npx tsx -e "
  import { NISchoolsParser } from './src/services/ni-schools-parser';
  const parser = new NISchoolsParser();
  parser.parse()
    .then(schools => console.log(\`Fetched \${schools.length} schools\`))
    .catch(err => console.error('Error:', err.message));
"
```

### Test Data Mapping
```bash
# Test the mapper
npx tsx -e "
  import { NISchoolsParser } from './src/services/ni-schools-parser';
  import { NISchoolsMapper } from './src/services/mappers/ni-schools-mapper';

  const parser = new NISchoolsParser();
  const mapper = new NISchoolsMapper();

  parser.parse()
    .then(schools => {
      const mapped = mapper.mapMany(schools);
      console.log('Sample school:', JSON.stringify(mapped[0], null, 2));
    })
    .catch(err => console.error('Error:', err.message));
"
```

## Integration Tests

### Run Contract Tests
```bash
# Run NI schools contract tests
pnpm test -- ni-schools-parser-contract
pnpm test -- ni-schools-mapper-contract
```

### Run Integration Tests
```bash
# Run full integration test
pnpm test -- ni-schools.integration
```

## Error Scenarios

### 1. Service Unavailable
Simulate by blocking the domain:
```bash
# Add to /etc/hosts temporarily
echo "127.0.0.1 apps.education-ni.gov.uk" | sudo tee -a /etc/hosts

# Run aggregator - should fail fast
pnpm run compile

# Clean up
sudo sed -i '' '/apps.education-ni.gov.uk/d' /etc/hosts
```

Expected: Clear error message about service unavailability

### 2. Format Change Detection
```bash
# Test with mock malformed response
npx tsx -e "
  import { NISchoolsParser } from './src/services/ni-schools-parser';
  const parser = new NISchoolsParser();

  // Mock the fetch to return invalid HTML
  parser['fetchPage'] = async () => '<html>Invalid</html>';

  parser.parse()
    .catch(err => console.log('Expected error:', err.message));
"
```

Expected: Error about missing ViewState token

### 3. Count Validation
```bash
# Test count validation with mock data
npx tsx -e "
  import { NISchoolsParser } from './src/services/ni-schools-parser';
  const parser = new NISchoolsParser();

  // Mock to return too few schools
  parser['parseExcel'] = async () => Array(100).fill({
    schoolName: 'Test',
    schoolType: 'Primary',
    status: 'Open'
  });

  parser.parse()
    .catch(err => console.log('Expected error:', err.message));
"
```

Expected: Error about school count being outside expected range

## Performance Check

### Measure Processing Time
```bash
time pnpm run compile 2>&1 | grep "Northern Ireland"
```

Expected: Processing completes within 30 seconds

### Memory Usage
```bash
# Monitor memory during execution
/usr/bin/time -l pnpm run compile 2>&1 | grep "maximum resident set size"
```

Expected: Memory usage under 500MB

## Data Quality Checks

### 1. Required Fields
```bash
# Check all schools have required fields
cat output/organisations.json | jq '
  [.[] | select(.category == "Northern Ireland School")] |
  map(select(.name == null or .subcategory == null)) |
  if length > 0 then "FAIL: Schools missing required fields" else "PASS: All required fields present" end
'
```

### 2. Address Information
```bash
# Check address population rate
cat output/organisations.json | jq '
  [.[] | select(.category == "Northern Ireland School")] |
  (map(select(.location != null)) | length) as $with_location |
  (length) as $total |
  "\($with_location)/\($total) schools have location data (\($with_location * 100 / $total)%)"
'
```

### 3. Management Types
```bash
# List management type distribution
cat output/organisations.json | jq '
  [.[] | select(.category == "Northern Ireland School") | .metadata.managementType] |
  group_by(.) |
  map({type: .[0], count: length}) |
  sort_by(.count) |
  reverse
'
```

## Troubleshooting

### Common Issues

1. **Connection timeout**
   - Check network connectivity
   - Verify https://apps.education-ni.gov.uk is accessible
   - Check firewall/proxy settings

2. **Count validation failure**
   - Check the website for current school count
   - Adjust tolerance in parser if needed
   - Verify status filter is working correctly

3. **Excel parsing errors**
   - Ensure xlsx package is installed
   - Check Excel file format hasn't changed
   - Verify response is actually Excel (not HTML error page)

### Debug Mode
```bash
# Run with debug logging
DEBUG=ni-schools:* pnpm run compile
```

### Manual Verification
Visit https://apps.education-ni.gov.uk/appinstitutes/default.aspx to:
- Check current school count
- Verify export functionality
- Compare sample data

## Success Criteria

✅ All tests pass
✅ ~1122 schools fetched (±10%)
✅ All school types represented
✅ Processing completes in <30 seconds
✅ No memory leaks
✅ Clear error messages on failure
✅ Data includes required fields
✅ Deduplication working correctly

## Next Steps

After successful quickstart:
1. Review the generated data in `output/organisations.json`
2. Check logs for any warnings
3. Verify integration with other data sources
4. Monitor nightly runs for stability