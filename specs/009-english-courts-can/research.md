# Research: UK Courts Data Sources

## Executive Summary
Three distinct data sources require different parsing strategies:
1. **England/Wales**: Structured CSV with comprehensive data
2. **Northern Ireland**: HTML list requiring webpage parsing
3. **Scotland**: Complex - requires further investigation

## England & Wales Courts CSV

### Decision: CSV Parser with csv-parse
**Rationale**: Well-structured CSV with consistent columns
**Alternatives considered**: Manual parsing (rejected - error-prone)

### Data Structure
```csv
Columns: name, lat, lon, number, cci_code, magistrate_code, slug, types, open, dx_number, areas_of_law, addresses
```

### Key Fields Mapping
- `name` → Court.name
- `types` → Court.type (parse JSON array)
- `open` → Court.status (true = "active", false = "inactive")
- `addresses` → Location (parse JSON)
- `lat`, `lon` → Location.coordinates
- `areas_of_law` → Services (parse JSON array)

### Data Quality
- Not all courts have complete information
- Some courts marked as inactive (open=false)
- Rich data for active courts including areas of law

## Northern Ireland Courts

### Decision: HTML Parser with cheerio
**Rationale**: Simple HTML structure, consistent pattern
**Alternatives considered**: Regex parsing (rejected - HTML parsing is more robust)

### Data Structure
```html
<ul>
  <li><a href="/node/[id]">[Court Name]</a></li>
</ul>
```

### Extraction Strategy
1. Fetch main page HTML
2. Parse with cheerio
3. Extract court names from anchor text
4. Follow individual court links for detailed information (if needed)

### Limitations
- Only court names available on main page
- Detailed information requires following individual links
- No status information (assume all are active)

## Scotland Courts

### Decision: Alternative Data Source Investigation Required
**Rationale**: No clear programmatic access method found
**Alternatives considered**:
1. Browser automation (rejected - per FR-022)
2. Manual data entry (rejected - not scalable)
3. Contact SCTS for data feed (recommended)

### Current Findings
- Main website has contact information only
- Court locator appears to be JavaScript-heavy
- No obvious API endpoints discovered
- `/court-locations` page returns 404

### Recommended Approach
1. Check for sitemap.xml
2. Look for alternative URLs like /courts/sheriff-courts
3. Parse individual court pages if accessible
4. As fallback: Create static list from public information

## Technical Decisions

### HTTP Client
**Decision**: axios
**Rationale**: Already in use, handles redirects, good error handling
**Alternatives**: fetch (native) - less feature-rich

### CSV Parsing
**Decision**: csv-parse
**Rationale**: Robust, handles edge cases, streaming support
**Alternatives**: Papa Parse - heavier dependency

### HTML Parsing
**Decision**: cheerio
**Rationale**: jQuery-like API, already in codebase, lightweight
**Alternatives**: jsdom - heavier, playwright - requires browser

### Error Handling Strategy
**Decision**: Fail-fast with clear messages
**Rationale**: Nightly runs need clear failure indicators
**Implementation**:
- Validate source availability first
- Clear error messages for format changes
- Log partial successes before failure

## Data Validation

### Expected Counts (Approximate)
- England & Wales: 300-400 courts
- Northern Ireland: 20-30 courts
- Scotland: 50-60 courts (if accessible)

### Validation Rules
1. Court must have a name
2. Active/open courts prioritized
3. Location data captured where available
4. No specific count validation required (FR-017)
5. Deduplication not performed (FR-020)

## Implementation Priority
1. **English Courts CSV** - Most straightforward, rich data
2. **NI Courts HTML** - Simple structure, limited data
3. **Scottish Courts** - Requires additional investigation

## Outstanding Questions Resolved
- CSV format: Analyzed and understood
- NI HTML structure: Simple list format confirmed
- Scottish access: Requires alternative approach
- Count validation: Not required per specification
- Deduplication: Explicitly excluded from scope