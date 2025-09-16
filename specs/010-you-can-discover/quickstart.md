# Quickstart: Groundwork Trusts and NHS Charities Integration

**Feature**: 010-you-can-discover
**Purpose**: Quick validation that the feature works end-to-end

## Prerequisites
```bash
# Ensure dependencies are installed
pnpm install

# Verify network connectivity
curl -I https://www.groundwork.org.uk/find-groundwork-near-me/
curl -I https://nhscharitiestogether.co.uk/about-us/nhs-charities-across-the-uk/
```

## Quick Test (5 minutes)

### 1. Run Contract Tests
Verify the parsers meet their contracts:
```bash
# Run Groundwork parser tests
pnpm test groundwork-parser.contract

# Run NHS Charities parser tests
pnpm test nhs-charities-parser.contract

# Run mapper tests
pnpm test groundwork-mapper.contract
```

Expected: All tests pass ✅

### 2. Test Individual Parsers
Test each parser in isolation:

```bash
# Test Groundwork parser
npx tsx src/services/groundwork-parser.ts

# Expected output:
# Fetching Groundwork Trusts...
# Found 15 trusts
# [
#   { "name": "Groundwork Cheshire, Lancashire and Merseyside" },
#   { "name": "Groundwork Five Counties" },
#   ...
# ]

# Test NHS Charities parser
npx tsx src/services/nhs-charities-parser.ts

# Expected output:
# Discovering API URL...
# Fetching NHS Charities data...
# Found 240 charities (filtered for England/Wales)
# [
#   {
#     "name": "Leeds Teaching Hospitals Charity",
#     "address": "...",
#     "postcode": "LS1 3EX",
#     ...
#   }
# ]
```

### 3. Run Full Aggregation
Test the complete integration:

```bash
# Run with new sources only
pnpm run compile --source groundwork
pnpm run compile --source nhs-charities

# Run full aggregation including new sources
pnpm run compile

# Check output
jq '.organisations[] | select(.additionalProperties.source == "groundwork" or .additionalProperties.source == "nhs_charities") | .name' dist/orgs.json | head -10
```

Expected output:
- ~15 Groundwork Trusts added
- ~240 NHS Charities added (England/Wales only)
- All classified as Central Government (S.1311)

### 4. Verify Data Quality
Check that data meets minimum requirements:

```bash
# Check all have names (minimum viable data)
jq '.organisations[] | select(.additionalProperties.source == "groundwork") | select(.name == null)' dist/orgs.json

# Expected: No output (all have names)

# Check NHS Charities have location data
jq '.organisations[] | select(.additionalProperties.source == "nhs_charities") | select(.location != null) | .name' dist/orgs.json | wc -l

# Expected: Most charities have location data
```

## Integration Tests

### Test Retry Logic
```bash
# Temporarily block network (macOS)
sudo pfctl -e
echo "block drop quick on any to {www.groundwork.org.uk}" | sudo pfctl -f -

# Run parser (should retry and fail)
npx tsx src/services/groundwork-parser.ts

# Expected: Retry attempts logged, then failure

# Restore network
sudo pfctl -d
```

### Test Edge Cases

1. **Empty Results Handling**
```javascript
// Mock empty dropdown in test
const mockHtml = '<select class="gnm_button"></select>';
// Parser should fail with clear error
```

2. **Invalid Country Filtering**
```javascript
// NHS Charities from Scotland/NI should be excluded
const scottishCharities = results.filter(c => c.country === 'Scotland');
expect(scottishCharities).toHaveLength(0);
```

3. **Missing Fields**
```javascript
// Organisation with just name should still be included
const minimal = { name: 'Test Trust' };
const mapped = mapper.map(minimal);
expect(mapped.name).toBe('Test Trust');
expect(mapped.type).toBe('central_government');
```

## Validation Checklist

- [ ] **Groundwork Trusts**
  - [ ] Fetches ~15 trusts from website
  - [ ] All have names extracted
  - [ ] Region extracted from name
  - [ ] Classified as Central Government
  - [ ] Sponsor set to DCLG

- [ ] **NHS Charities**
  - [ ] API URL discovered from webpage
  - [ ] Fetches 200+ charities from API
  - [ ] Filtered to England/Wales only
  - [ ] Location data preserved (address, coordinates)
  - [ ] Classified as Central Government
  - [ ] Sponsor set to DoH

- [ ] **Error Handling**
  - [ ] Retries on network failure
  - [ ] Clear error messages on structure change
  - [ ] Fails fast after retries exhausted
  - [ ] Logs progress for debugging

- [ ] **Integration**
  - [ ] Both sources included in orchestrator
  - [ ] Output written to dist/orgs.json
  - [ ] No deduplication between sources
  - [ ] Data quality scores calculated

## Troubleshooting

### "Failed to fetch Groundwork Trusts"
- Check website is accessible
- Verify select.gnm_button exists in HTML
- Check for website redesign

### "Map ID not found"
- NHS Charities page may have changed
- Check for mapId variable in page JavaScript
- Verify Storepoint widget is still used

### "No charities returned"
- API endpoint may have changed
- Check country filtering logic
- Verify API response format

## Performance Baseline
- Groundwork fetch: <2 seconds
- NHS Charities fetch: <5 seconds
- Total aggregation: <10 seconds for both sources

## Success Criteria
✅ 15+ Groundwork Trusts in output
✅ 200+ NHS Charities in output (England/Wales)
✅ All have minimum required field (name)
✅ Proper ONS classification (S.1311)
✅ Clean error handling with retries