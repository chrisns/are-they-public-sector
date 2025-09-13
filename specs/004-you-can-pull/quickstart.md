# Quickstart: NHS Trusts and Local Authorities Integration

## Prerequisites
- Node.js 18+ installed
- pnpm package manager
- Internet connection for fetching data

## Installation
```bash
# Install dependencies
pnpm install

# Verify cheerio is installed
pnpm list cheerio
```

## Quick Test - NHS Trusts
```bash
# Run the aggregator with NHS source only
pnpm run compile -- --source nhs-provider-directory

# Check the output
cat data/aggregated.json | jq '.summary.sources."nhs-provider-directory"'
# Expected: ~215 NHS Trusts

# Verify Foundation Trusts are identified
cat data/aggregated.json | jq '.organisations[] | select(.source=="nhs-provider-directory" and .subcategory=="nhs-foundation-trust") | .name' | head -5
```

## Quick Test - Local Authorities
```bash
# Run the aggregator with Local Authorities only
pnpm run compile -- --source defra-uk-air

# Check the output
cat data/aggregated.json | jq '.summary.sources."defra-uk-air"'
# Expected: ~408 Local Authorities

# Verify different council types
cat data/aggregated.json | jq '.organisations[] | select(.source=="defra-uk-air") | .subcategory' | sort | uniq -c
```

## Full Integration Test
```bash
# Run all sources including new ones
pnpm run compile

# Verify all sources present
cat data/aggregated.json | jq '.summary.sources'

# Expected output structure:
# {
#   "gov-uk": 611,
#   "ons-institutional": 3360,
#   "ons-non-institutional": 57,
#   "nhs-provider-directory": ~215,
#   "defra-uk-air": ~408
# }

# Check total count
cat data/aggregated.json | jq '.summary.totalOrganisations'
# Expected: ~4651
```

## Error Scenarios

### Test Source Unavailability
```bash
# Simulate network failure (disconnect internet or use firewall)
# Then run:
pnpm run compile

# Expected: Clear error message
# "Failed to fetch NHS Provider Directory: Network error"
```

### Verify Deduplication
```bash
# Check for duplicate NHS organisations
cat data/aggregated.json | jq '.organisations[] | select(.category=="health") | .name' | sort | uniq -d
# Expected: Empty (no duplicates)

# Check for duplicate local authorities
cat data/aggregated.json | jq '.organisations[] | select(.category=="local-government") | .name' | sort | uniq -d
# Expected: Empty (no duplicates)
```

## Validation Checklist
- [ ] NHS Trusts fetch successfully (200+ count)
- [ ] Foundation Trusts identified by name
- [ ] Local Authorities fetch successfully (300+ count)
- [ ] Council types correctly inferred
- [ ] No duplicate organisations after deduplication
- [ ] Clear error on source unavailability
- [ ] All tests pass: `pnpm test`
- [ ] Coverage maintained: `pnpm run coverage`

## Troubleshooting

**Low counts returned**:
- Check internet connectivity
- Verify source URLs are accessible
- Review logs for parsing errors

**Parsing errors**:
- Source HTML structure may have changed
- Check error logs for specific elements not found
- Run in debug mode: `DEBUG=* pnpm run compile`

**Deduplication issues**:
- Review normalized names in logs
- Check domain extraction logic
- Verify Levenshtein threshold settings