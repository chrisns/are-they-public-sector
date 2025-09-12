# Quickstart: Fix Organization Count Discrepancies

**Feature**: 002-the-current-implementation  
**Objective**: Fix aggregator to return exactly 4028 organizations (611 + 3360 + 57)

## Quick Verification

Run the aggregator and verify counts:
```bash
# Run the aggregator
pnpm run compile

# Expected output should show:
# - GOV.UK: 611 organizations
# - ONS Institutional: 3360 organizations  
# - ONS Non-Institutional: 57 organizations
# - Total: 4028 organizations
```

## Manual Testing Steps

### 1. Test GOV.UK API Fetching
```bash
# Test GOV.UK API directly
curl "https://www.gov.uk/api/organisations" | jq '.total'
# Should return: 611
```

### 2. Test ONS Excel Download
```bash
# Check if Excel file is downloaded
ls -la data/*.xlsx
# Should show the ONS classification file
```

### 3. Verify Output File
```bash
# Check the output JSON
jq '.metadata.statistics.totalOrganisations' dist/orgs.json
# Should return: 4028

# Check individual source counts
jq '.metadata.sources[] | {source: .source, count: .recordCount}' dist/orgs.json
```

## Debugging Commands

### Check Source Counts
```bash
# Count GOV.UK organizations
jq '[.organisations[] | select(.sources[].source == "gov_uk_api")] | length' dist/orgs.json

# Count ONS Institutional Units
jq '[.organisations[] | select(.sources[].source == "ons_institutional")] | length' dist/orgs.json

# Count ONS Non-Institutional Units
jq '[.organisations[] | select(.sources[].source == "ons_non_institutional")] | length' dist/orgs.json
```

### Validate Data Quality
```bash
# Check for organizations with missing names
jq '[.organisations[] | select(.name == null or .name == "")] | length' dist/orgs.json
# Should return: 0

# Check for duplicates
jq '[.organisations[].name] | group_by(.) | map(select(length > 1)) | length' dist/orgs.json
# Should return: 0 or small number
```

## Expected Test Results

### Contract Tests
```bash
pnpm test tests/contract/

# Should pass:
✓ GOV.UK API returns 611 organizations
✓ ONS Excel has "Organisation|Institutional Unit" sheet with 3360 records
✓ ONS Excel has "Non-Institutional Units" sheet with 57 records
```

### Integration Tests
```bash
pnpm test tests/integration/

# Should pass:
✓ Aggregation combines all sources correctly
✓ Deduplication preserves unique organizations
✓ Field mapping preserves all required fields
```

### E2E Tests
```bash
pnpm test tests/e2e/

# Should pass:
✓ Full aggregation returns 4028 organizations
✓ Output file is valid JSON
✓ All metadata is present
```

## Common Issues & Solutions

### Issue: Returns 0 organizations
**Solution**: Check API pagination and Excel sheet names
```bash
# Enable debug mode to see detailed logs
pnpm run compile -- --debug
```

### Issue: Wrong Excel file downloaded
**Solution**: Check ONS scraping patterns
```bash
# List available Excel files on ONS page
curl -s "https://www.ons.gov.uk/economy/nationalaccounts/uksectoraccounts/datasets/publicsectorclassificationguide" | grep -o 'href="[^"]*\.xlsx"'
```

### Issue: Sheet names don't match
**Solution**: List actual sheet names in Excel
```bash
# Use a tool to list Excel sheet names
# Or check parser logs with debug enabled
```

## Performance Metrics

Expected performance for full aggregation:
- **Execution time**: < 5 seconds
- **Memory usage**: < 100 MB
- **API calls**: ~7 (paginated GOV.UK)
- **File downloads**: 1 (ONS Excel)

## Success Criteria

The fix is successful when:
1. ✅ GOV.UK API returns exactly 611 organizations
2. ✅ ONS Institutional sheet returns exactly 3360 organizations
3. ✅ ONS Non-Institutional sheet returns exactly 57 organizations
4. ✅ Total output contains 4028 organizations
5. ✅ All tests pass (contract, integration, e2e)
6. ✅ No data loss during aggregation
7. ✅ Proper error handling and logging

## Next Steps

After verification:
1. Commit the fixes with appropriate tests
2. Update documentation if API/Excel structure changed
3. Add monitoring for count discrepancies
4. Consider caching to improve performance