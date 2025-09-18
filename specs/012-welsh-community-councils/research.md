# Research: Welsh and Scottish Community Councils & NI Health Trusts

## Executive Summary
Research into adding three new organisation types to the UK Public Sector Organisation Aggregator: Welsh Community Councils, Scottish Community Councils, and Northern Ireland Health and Social Care Trusts. All three sources require HTML scraping with varying complexity levels.

## Source Analysis

### Welsh Community Councils (Wikipedia)
- **URL**: https://en.wikipedia.org/wiki/List_of_communities_in_Wales
- **Structure**: Nested lists organized by principal area
- **Data Available**: Community name, principal area, town/city status
- **Estimated Count**: ~1,100 communities
- **Complexity**: Medium - requires parsing nested lists and handling reference markers

### Scottish Community Councils (Wikipedia)
- **URL**: https://en.wikipedia.org/wiki/List_of_community_council_areas_in_Scotland
- **Structure**: Hierarchical lists by council area
- **Data Available**: Community council name, council area, active status (asterisk marker)
- **Estimated Count**: ~1,200 community councils
- **Complexity**: High - inconsistent formatting between regions

### NI Health and Social Care Trusts (NI Direct)
- **URL**: https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts
- **Structure**: Simple list with links to detail pages
- **Data Available**: Trust name, contact details (on linked pages)
- **Count**: 6 trusts
- **Complexity**: Low - simple list parsing

## Technical Decisions

### Decision: HTML Scraping with Cheerio
**Rationale**:
- Consistent with existing codebase patterns
- All sources are HTML-based without API alternatives
- Cheerio provides jQuery-like server-side DOM manipulation
- Proven reliability in similar parsers (groundwork, devolved-admin)

**Alternatives Considered**:
- Direct API access: Not available for any of the three sources
- Browser automation (Puppeteer): Unnecessary overhead for static HTML
- Regular expressions: Too fragile for complex HTML structures

### Decision: Service Pattern Architecture
**Rationale**:
- Follows existing fetcher → parser → mapper pattern
- Separation of concerns for maintainability
- Each service can be tested independently
- Consistent with project architecture

**Alternatives Considered**:
- Monolithic scraper: Less testable and maintainable
- External service: Adds unnecessary complexity

### Decision: Retry Logic with Exponential Backoff
**Rationale**:
- Wikipedia and NI Direct may have rate limiting
- Network failures should be handled gracefully
- Pattern already established in codebase (nhs-charities-parser, groundwork-parser)

**Alternatives Considered**:
- No retry logic: Would fail on transient errors
- Fixed retry intervals: Less efficient than exponential backoff

## Implementation Patterns

### Established Patterns to Follow

1. **HTTP Fetching**
```typescript
private async fetchWithRetry(retryCount = 0): Promise<string> {
  try {
    const response = await axios.get(this.url, {
      timeout: this.timeout,
      headers: { 'User-Agent': 'UK-Public-Sector-Aggregator' }
    });
    return response.data;
  } catch (error) {
    if (retryCount < this.maxRetries - 1) {
      await this.delay(1000 * Math.pow(2, retryCount));
      return this.fetchWithRetry(retryCount + 1);
    }
    throw error;
  }
}
```

2. **HTML Parsing with Cheerio**
```typescript
const $ = cheerio.load(html);
// jQuery-like selectors for data extraction
```

3. **Data Validation**
```typescript
if (results.length === 0) {
  throw new Error(`No data found at ${this.url}`);
}
console.log(`Parsed ${results.length} items from ${source}`);
```

## Data Model Extensions

### WelshCommunityRaw
```typescript
interface WelshCommunityRaw {
  name: string;
  principalArea: string;
  population?: number;
  website?: string;
  notes?: string;
}
```

### ScottishCommunityRaw
```typescript
interface ScottishCommunityRaw {
  name: string;
  councilArea: string;
  region?: string;
  isActive: boolean;
  contactDetails?: string;
}
```

### NIHealthTrustRaw
```typescript
interface NIHealthTrustRaw {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  servicesProvided?: string[];
}
```

## Risk Mitigation

### Wikipedia Structure Changes
- **Risk**: Page structure may change without notice
- **Mitigation**: Implement flexible selectors, add structure validation, monitor for failures

### Rate Limiting
- **Risk**: Too many requests may trigger rate limiting
- **Mitigation**: Add delays between requests, implement exponential backoff

### Data Quality
- **Risk**: Inconsistent data formats across sources
- **Mitigation**: Normalize data during parsing, handle edge cases explicitly

### Character Encoding
- **Risk**: Welsh and Scottish names may have special characters
- **Mitigation**: Ensure UTF-8 handling throughout pipeline

## Performance Considerations

### Expected Performance
- Welsh Councils: ~5-10 seconds (single page parse)
- Scottish Councils: ~5-10 seconds (single page parse)
- NI Health Trusts: ~2-5 seconds (simple list)
- Total: Under 30 seconds for all three sources

### Optimization Opportunities
1. Parallel fetching of all three sources
2. Caching parsed data with TTL
3. Incremental updates rather than full re-fetch

## Testing Strategy

### Unit Tests
- Parser logic for each source
- Data normalization functions
- Error handling scenarios

### Integration Tests
- Full fetch → parse → map pipeline
- Network error simulation
- Rate limiting handling

### Contract Tests
- Verify data structure contracts
- Validate required fields
- Check data types and formats

## Dependencies Required

### Existing Dependencies (Already in project)
- axios: HTTP client
- cheerio: Server-side DOM manipulation
- typescript: Type safety

### No New Dependencies Required
All functionality can be implemented with existing project dependencies.

## Conclusion

The implementation should follow established patterns in the codebase, using cheerio for HTML parsing and the existing service architecture. Welsh and Scottish councils require more complex parsing due to nested structures, while NI Health Trusts are straightforward. All three sources can be integrated within the 30-second performance target using parallel fetching.