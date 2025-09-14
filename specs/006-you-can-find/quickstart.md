# Quickstart: Emergency Services and Devolved Administration Aggregation

## Overview
This guide demonstrates the emergency services and devolved administration aggregation feature, which adds ~115 new organisations to the dataset from three sources:
- UK Police Forces (~45 forces)
- Fire and Rescue Services (~50 services)
- Additional Devolved Bodies (~20 entities)

## Prerequisites
```bash
# Ensure dependencies are installed
pnpm install

# Build the TypeScript code
pnpm build
```

## Quick Test

### 1. Run Emergency Services Aggregation
```bash
# Aggregate only emergency services
pnpm run compile -- --source police
pnpm run compile -- --source fire
pnpm run compile -- --source devolved-extra

# Or run all at once
pnpm run compile -- --source emergency-services
```

Expected output:
```
🚨 Fetching Police Forces...
  ✓ UK Forces: 43 forces found
  ✓ Non-UK Forces: 5 forces found
  → Total: 48 police forces

🔥 Fetching Fire Services...
  ✓ NFCC Page: 52 services found
  → Total: 52 fire services

🏛️ Fetching Additional Devolved Bodies...
  ✓ Guidance Page: 18 new bodies found
  ✓ Deduplication: 3 existing bodies updated
  → Total: 15 new devolved bodies

✅ Emergency services aggregation complete
```

### 2. Verify Output
```bash
# Check the output file
jq '.summary.organisationsByType.emergency_service' dist/orgs.json
# Should show ~100 emergency services

# Check specific police forces
jq '.organisations[] | select(.name | contains("Metropolitan Police"))' dist/orgs.json

# Check fire services
jq '.organisations[] | select(.classification | contains("Fire"))' dist/orgs.json

# Check new devolved bodies
jq '.organisations[] | select(.sources[].source == "gov_uk_guidance")' dist/orgs.json
```

## Test Scenarios

### Scenario 1: Successful Full Aggregation
```bash
# Clean start
rm -f dist/orgs.json

# Run full aggregation including emergency services
pnpm run compile

# Verify all sources processed
jq '.metadata.sources' dist/orgs.json
# Should include: "police_uk", "nfcc", "gov_uk_guidance"
```

### Scenario 2: HTML Structure Change Detection
```bash
# Simulate structure change by modifying parser
echo "Simulating HTML change..." 

# Run with structure validation
STRICT_VALIDATION=true pnpm run compile -- --source police

# Should fail fast with error:
# ❌ HTML structure changed at https://www.police.uk/... 
# Expected selector ".police-forces" not found
```

### Scenario 3: Deduplication Verification
```bash
# Run devolved bodies twice
pnpm run compile -- --source devolved
pnpm run compile -- --source devolved-extra

# Check for duplicates
jq '[.organisations[] | select(.type == "devolved_administration")] | 
    group_by(.name) | 
    map(select(length > 1)) | 
    length' dist/orgs.json
# Should return 0 (no duplicates)
```

### Scenario 4: Classification Accuracy
```bash
# Verify police force classifications
jq '.organisations[] | 
    select(.type == "emergency_service" and .additionalProperties.serviceType == "police") | 
    {name, forceType: .additionalProperties.forceType}' dist/orgs.json

# Check force types distribution
jq '[.organisations[] | 
     select(.additionalProperties.serviceType == "police")] | 
     group_by(.additionalProperties.forceType) | 
     map({type: .[0].additionalProperties.forceType, count: length})' dist/orgs.json

# Expected:
# - territorial: ~43
# - special: ~3
# - crown_dependency: ~3
```

### Scenario 5: Fire Service Authority Types
```bash
# Check fire service classifications
jq '[.organisations[] | 
     select(.additionalProperties.serviceType == "fire")] | 
     group_by(.additionalProperties.authorityType) | 
     map({type: .[0].additionalProperties.authorityType, count: length})' dist/orgs.json

# Expected distribution:
# - county: ~25
# - metropolitan: ~6
# - combined_authority: ~10
# - unitary: ~11
```

### Scenario 6: Network Resilience
```bash
# Test with network throttling
# (Simulated via environment variable)
NETWORK_DELAY=2000 pnpm run compile -- --source police

# Should complete successfully with retries:
# ⏳ Request delayed, retrying (1/3)...
# ⏳ Request delayed, retrying (2/3)...
# ✓ Police forces fetched successfully
```

### Scenario 7: Partial Failure Handling
```bash
# Run with one source unavailable
# (NFCC site down simulation)
MOCK_NFCC_ERROR=true pnpm run compile

# Should show:
# ✓ Police forces: 48 fetched
# ❌ Fire services: Failed (continuing with other sources)
# ✓ Devolved bodies: 15 fetched
# ⚠️ Aggregation completed with 1 source failure
```

## Integration Tests

### Test: Verify All Emergency Services Present
```javascript
// tests/integration/emergency-services.integration.test.ts
describe('Emergency Services Integration', () => {
  it('should include all major UK police forces', async () => {
    const output = await runAggregator(['--source', 'police']);
    const policeForces = output.organisations.filter(o => 
      o.additionalProperties?.serviceType === 'police'
    );
    
    // Check for key forces
    const expectedForces = [
      'Metropolitan Police Service',
      'Police Scotland',
      'Police Service of Northern Ireland',
      'British Transport Police'
    ];
    
    expectedForces.forEach(forceName => {
      const found = policeForces.find(f => f.name.includes(forceName));
      expect(found).toBeDefined();
    });
  });

  it('should include all UK fire services', async () => {
    const output = await runAggregator(['--source', 'fire']);
    const fireServices = output.organisations.filter(o => 
      o.additionalProperties?.serviceType === 'fire'
    );
    
    expect(fireServices.length).toBeGreaterThanOrEqual(45);
    
    // Check for London Fire Brigade
    const london = fireServices.find(s => s.name.includes('London'));
    expect(london).toBeDefined();
    expect(london.additionalProperties.authorityType).toBe('metropolitan');
  });

  it('should add new devolved bodies without duplication', async () => {
    const beforeCount = getExistingDevolvedCount();
    const output = await runAggregator(['--source', 'devolved-extra']);
    const afterCount = output.organisations.filter(o => 
      o.type === 'devolved_administration'
    ).length;
    
    expect(afterCount).toBeGreaterThan(beforeCount);
    expect(afterCount).toBeLessThan(beforeCount * 2); // No mass duplication
  });
});
```

## Performance Benchmarks

Expected performance for emergency services aggregation:

| Source | Records | Time | Memory |
|--------|---------|------|--------|
| Police Forces | ~48 | <5s | <50MB |
| Fire Services | ~52 | <5s | <50MB |
| Devolved Bodies | ~15 | <3s | <30MB |
| **Total** | **~115** | **<15s** | **<100MB** |

## Troubleshooting

### Issue: No police forces found
```bash
# Check HTML structure hasn't changed
curl -s https://www.police.uk/pu/contact-us/uk-police-forces/ | grep -c "police"
# Should return > 40
```

### Issue: Fire services count too low
```bash
# Verify NFCC page is accessible
curl -I https://nfcc.org.uk/contacts/fire-and-rescue-services/
# Should return 200 OK
```

### Issue: Devolved bodies not parsing
```bash
# Check guidance page structure
curl -s https://www.gov.uk/guidance/devolution-of-powers-to-scotland-wales-and-northern-ireland | \
  grep -E "(Scotland|Wales|Northern Ireland)"
# Should find all three nations
```

## Summary

The emergency services feature adds comprehensive coverage of UK police and fire services, plus additional devolved administration bodies. The aggregation:

1. ✅ Fetches ~48 police forces (UK + Crown Dependencies)
2. ✅ Fetches ~52 fire and rescue services
3. ✅ Adds ~15 new devolved bodies
4. ✅ Deduplicates against existing data
5. ✅ Classifies services correctly
6. ✅ Handles network failures gracefully
7. ✅ Fails fast on structure changes

Total new organisations: ~115

---
*Quickstart guide complete - ready for implementation*