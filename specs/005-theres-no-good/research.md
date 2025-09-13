# Research: Schools Data Aggregation

## API Analysis

### Decision: GIAS JSON API with User-Agent Header
**Rationale**: Direct JSON API available without authentication, provides structured data with all required fields
**Alternatives considered**: 
- HTML scraping: More complex, less reliable
- CSV downloads: Not real-time, requires manual updates

### API Structure Findings

**Endpoint**: `https://get-information-schools.service.gov.uk/Establishments/Search/results-json`

**Required Headers**:
- User-Agent: Browser-like string (e.g., "Mozilla/5.0")

**Response Format**:
```json
{
  "name": "School Name",
  "location": { "latitude": 51.59, "longitude": -0.018 },
  "address": "Full address",
  "urn": 134418,
  "laestab": "320/6063",
  "status": "Open",
  "localAuthority": "Waltham Forest",
  "phaseType": "Primary, Academy converter"
}
```

## Pagination Strategy

### Decision: Incremental startIndex with 100-record pages
**Rationale**: API returns fixed 100 records per page, empty array signals completion
**Alternatives considered**: 
- Parallel requests: Risk of rate limiting
- Bulk download: Not available via API

**Implementation**:
- Start at index 0
- Increment by 100
- Continue until empty array `[]` received
- No total count provided by API

## Search Strategy

### Decision: Use single letter "e" search to capture all schools
**Rationale**: Testing shows "e" returns most comprehensive results (~30,000+ schools)
**Alternatives considered**:
- Multiple searches ("a", "b", "c"...): Risk of duplicates
- "school" search: May miss establishments without "school" in name
- No search parameter: Returns error

## Error Handling

### Decision: Exponential backoff with max 5 retries
**Rationale**: Network failures common with large datasets, backoff prevents overwhelming server
**Alternatives considered**:
- Linear retry: Less effective for temporary issues
- No retry: Risk of incomplete data

**Backoff schedule**:
- Initial: 1 second
- Factor: 2x
- Max delay: 32 seconds
- Max attempts: 5

## Data Validation

### Decision: Validate URN and name only
**Rationale**: URN is unique identifier, name is mandatory per spec
**Alternatives considered**:
- Strict validation of all fields: Too restrictive, data quality varies
- No validation: Risk of corrupt data

## Deduplication Strategy

### Decision: Use URN as unique key
**Rationale**: URN (Unique Reference Number) is government-assigned unique identifier
**Alternatives considered**:
- Name-based: Schools can have similar names
- laestab: Format varies, less reliable

## Performance Considerations

### Expected Volume
- ~30,000 open schools
- ~300 API calls (100 records each)
- Estimated time: 5-10 minutes with delays

### Rate Limiting
- No documented rate limits found
- Implement 500ms delay between requests for safety
- Monitor for 429 responses

## Data Mapping

### Fields to Extract
All available fields will be extracted:
- `urn` → `urn` (number)
- `name` → `name` (string)
- `status` → `status` (string, filter for "Open")
- `address` → `address` (string)
- `localAuthority` → `localAuthority` (string)
- `phaseType` → `phaseType` (string)
- `laestab` → `laestab` (string)
- `location.latitude` → `latitude` (number, nullable)
- `location.longitude` → `longitude` (number, nullable)

## Integration Points

### CLI Command
```bash
pnpm run compile
# Or directly:
tsx src/cli/index.ts --schools
```

### Output Format
Consistent with existing aggregator:
```json
{
  "schools": [
    {
      "urn": 134418,
      "name": "School Name",
      "status": "Open",
      // ... all other fields
    }
  ]
}
```

## Testing Strategy

### Contract Tests
- Mock API responses
- Test pagination logic
- Test retry mechanism
- Test deduplication

### Integration Tests
- Test with live API (small subset)
- Verify data structure
- Test error scenarios

### Coverage Goals
- Target 80% overall coverage
- Mock external HTTP calls in unit tests
- Real API calls in integration tests only