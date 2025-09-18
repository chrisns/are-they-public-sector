# Quickstart: Welsh and Scottish Community Councils & NI Health Trusts

## Overview
This guide demonstrates how to fetch and integrate Welsh Community Councils, Scottish Community Councils, and Northern Ireland Health and Social Care Trusts into the UK Public Sector Organisation Aggregator.

## Prerequisites
```bash
# Ensure dependencies are installed
pnpm install

# Verify TypeScript compilation
pnpm run lint
```

## Quick Test - Individual Sources

### Test Welsh Community Councils
```bash
# Run Welsh councils fetcher
npx tsx src/services/fetchers/welsh-councils-fetcher.ts

# Expected output:
# Fetching Welsh community councils from Wikipedia...
# Parsed 1100+ Welsh community councils
# Sample: Aberaeron (Ceredigion), Abergavenny (Monmouthshire)...
```

### Test Scottish Community Councils
```bash
# Run Scottish councils fetcher
npx tsx src/services/fetchers/scottish-councils-fetcher.ts

# Expected output:
# Fetching Scottish community councils from Wikipedia...
# Found 1200+ active Scottish community councils
# Sample: Abbey (Dumfries and Galloway), Abercorn (West Lothian)...
```

### Test NI Health Trusts
```bash
# Run NI Health Trusts fetcher
npx tsx src/services/fetchers/ni-health-trusts-fetcher.ts

# Expected output:
# Fetching NI Health and Social Care Trusts...
# Found 6 health trusts
# - Belfast Health and Social Care Trust
# - Northern Health and Social Care Trust
# - South Eastern Health and Social Care Trust
# - Southern Health and Social Care Trust
# - Western Health and Social Care Trust
# - Northern Ireland Ambulance Service
```

## Integration Test - Full Pipeline

### Run Complete Aggregation
```bash
# Run the full aggregator with new sources
pnpm run compile

# Expected output:
# Starting UK Public Sector Organisation Aggregator...
#
# Fetching data from all sources...
# ✓ Welsh Community Councils: 1100+ organisations
# ✓ Scottish Community Councils: 1200+ organisations
# ✓ NI Health Trusts: 6 organisations
# ✓ [Other existing sources...]
#
# Deduplicating organisations...
# Total unique organisations: 55000+
#
# Output written to: data/output/public-sector-orgs.json
```

## Verify Output

### Check JSON Structure
```bash
# Verify Welsh councils in output
jq '.[] | select(.type == "Welsh Community Council") | .name' data/output/public-sector-orgs.json | head -5

# Verify Scottish councils
jq '.[] | select(.type == "Scottish Community Council") | .name' data/output/public-sector-orgs.json | head -5

# Verify NI Health Trusts
jq '.[] | select(.type == "Health and Social Care Trust (NI)") | .name' data/output/public-sector-orgs.json

# Count by type
jq '[.[] | select(.type | contains("Council"))] | length' data/output/public-sector-orgs.json
```

### Sample Output Structure
```json
{
  "id": "WCC_aberaeron",
  "name": "Aberaeron",
  "type": "Welsh Community Council",
  "subType": "Ceredigion",
  "location": "Ceredigion, Wales",
  "sourceUrl": "https://en.wikipedia.org/wiki/List_of_communities_in_Wales",
  "lastUpdated": "2025-09-17T10:00:00Z"
}
```

## Testing

### Run Unit Tests
```bash
# Test individual parsers
pnpm test -- welsh-councils
pnpm test -- scottish-councils
pnpm test -- ni-health-trusts

# Run all new tests
pnpm test -- community-councils
```

### Run Integration Tests
```bash
# Full pipeline test
pnpm test -- integration/community-councils.test.ts

# Expected: All tests pass with 80%+ coverage
```

## Troubleshooting

### Common Issues

1. **Wikipedia Page Structure Changed**
   ```bash
   # Check if Wikipedia pages are accessible
   curl -I https://en.wikipedia.org/wiki/List_of_communities_in_Wales

   # If structure changed, update selectors in parser
   ```

2. **NI Direct Website Unavailable**
   ```bash
   # Check NI Direct status
   curl -I https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts

   # Fetcher will retry 3 times with exponential backoff
   ```

3. **Unexpected Data Count**
   ```bash
   # Enable debug logging
   DEBUG=* pnpm run compile

   # Check for parsing errors in logs
   ```

## Performance Metrics

### Expected Performance
- Welsh Councils: 5-10 seconds
- Scottish Councils: 5-10 seconds
- NI Health Trusts: 2-5 seconds
- **Total for all three**: Under 30 seconds

### Validate Performance
```bash
# Time individual fetchers
time npx tsx src/services/fetchers/welsh-councils-fetcher.ts
time npx tsx src/services/fetchers/scottish-councils-fetcher.ts
time npx tsx src/services/fetchers/ni-health-trusts-fetcher.ts
```

## Data Quality Checks

### Validate Required Fields
```bash
# Check all Welsh councils have principal areas
jq '.[] | select(.type == "Welsh Community Council" and .subType == null) | .name' data/output/public-sector-orgs.json

# Check all have source URLs
jq '.[] | select(.type | contains("Council")) | select(.sourceUrl == null) | .name' data/output/public-sector-orgs.json

# Should return empty if all valid
```

### Check for Duplicates
```bash
# Find any duplicate IDs
jq -r '.[].id' data/output/public-sector-orgs.json | sort | uniq -d

# Should return empty if no duplicates
```

## Next Steps

1. **Monitor Data Quality**: Set up alerts for unexpected count changes
2. **Schedule Updates**: Configure daily/weekly refresh of data
3. **Add Metrics**: Track fetch success rates and performance
4. **Extend Data**: Consider adding more metadata fields as they become available

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review parser code in `src/services/fetchers/`
3. Validate source websites are accessible
4. Run tests to identify specific failures