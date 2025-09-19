# Research: UK Government Organisation Data Sources

## Overview
Research findings for implementing 12 new UK government organisation data sources using web scraping and CSV parsing approaches.

## Source-Specific Research

### 1. English Unitary Authorities (ONS)
**Decision**: Two-step fetch - first get HTML page, extract CSV link, then fetch CSV
**Rationale**: Link changes dynamically with each data update
**Alternatives considered**:
- Direct CSV URL: Not viable as URL changes
- Cache link: Could become stale between runs

**Implementation**:
- Fetch: https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/alistofunitaryauthoritiesinenglandwithageographicalmap
- Extract CSV link using cheerio selector: `a[href$=".csv"]` or similar
- Parse CSV with csv-parse library

### 2. Districts of England (Wikipedia)
**Decision**: Parse Wikipedia HTML table directly
**Rationale**: Stable table structure, well-formatted data
**Alternatives considered**:
- Wikipedia API: More complex for table extraction

**Implementation**:
- URL: https://en.wikipedia.org/wiki/Districts_of_England
- Selector: `table.wikitable tbody tr`
- Extract district name from first `td`

### 3. National Park Authorities England
**Decision**: Simple HTML list extraction
**Rationale**: Clean member listing page
**Alternatives considered**: None needed

**Implementation**:
- URL: https://nationalparksengland.org.uk/our-members
- Selector pattern for member list items
- Extract organisation names from list elements

### 4. Integrated Care Boards (NHS)
**Decision**: Parse NHS service locator HTML
**Rationale**: Official NHS source with structured data
**Alternatives considered**:
- NHS API: Not publicly available

**Implementation**:
- URL: https://www.nhs.uk/nhs-services/find-your-local-integrated-care-board/
- Extract ICB listings from page structure
- May need region-specific navigation

### 5. Local Healthwatch (Paginated)
**Decision**: Iterative pagination until no more results
**Rationale**: Must capture all organisations across pages
**Alternatives considered**:
- Bulk export: Not available

**Implementation**:
- Base URL: https://www.healthwatch.co.uk/your-local-healthwatch/list?title=
- Pagination parameter: `?page=N` or similar
- Continue until no results or "no more pages" indicator

### 6. Scottish Government Organisations (MyGov.scot)
**Decision**: Parse organisations directory page
**Rationale**: Central directory of Scottish government bodies
**Alternatives considered**: None

**Implementation**:
- URL: https://www.mygov.scot/organisations
- Extract organisation list from main content
- Capture organisation names and types if available

### 7. NHS Scotland Health Boards
**Decision**: Parse NHS Scotland organisations page
**Rationale**: Official source for health boards
**Alternatives considered**: None

**Implementation**:
- URL: https://www.scot.nhs.uk/organisations/
- Extract health board names from listing
- May include special health boards

### 8. Scottish Regional Transport Partnerships
**Decision**: Extract from Transport Scotland page
**Rationale**: Authoritative source for RTPs
**Alternatives considered**: None

**Implementation**:
- URL: https://www.transport.gov.scot/our-approach/strategy/regional-transport-partnerships/
- Extract RTP names from content
- Seven RTPs expected

### 9. Welsh Unitary Authorities (Law.gov.wales)
**Decision**: Parse local government bodies page
**Rationale**: Official Welsh government source
**Alternatives considered**:
- Wikipedia: Less authoritative

**Implementation**:
- URL: https://law.gov.wales/local-government-bodies
- Extract 22 unitary authorities
- Welsh names may include special characters

### 10. Northern Ireland Trust Ports
**Decision**: Extract from Infrastructure NI page
**Rationale**: Official source for NI ports
**Alternatives considered**: None

**Implementation**:
- URL: https://www.infrastructure-ni.gov.uk/articles/gateways-sea-ports
- Extract trust port names
- Expected: Belfast, Londonderry, Warrenpoint

### 11. Northern Ireland Government Departments
**Decision**: Parse departments listing page
**Rationale**: Official NI government source
**Alternatives considered**: None

**Implementation**:
- URL: https://www.northernireland.gov.uk/topics/government-departments
- Extract department names
- Include executive agencies if listed

### 12. UK Research Councils (UKRI)
**Decision**: Extract from UKRI councils page
**Rationale**: Central listing of all research councils
**Alternatives considered**: None

**Implementation**:
- URL: https://www.ukri.org/councils/
- Extract council names (7 research councils + Innovate UK + Research England)
- Well-structured listing expected

## Common Patterns

### Error Handling
**Decision**: Use existing retry mechanism with exponential backoff
**Rationale**: Consistent with current codebase (FR-011)
**Implementation**:
- 3 retry attempts
- Exponential backoff: 1s, 2s, 4s
- Log failures with source identification

### HTML Parsing
**Decision**: Cheerio for all HTML sources
**Rationale**: Already used in project, lightweight, jQuery-like API
**Alternatives considered**:
- Puppeteer: Overkill for static HTML
- Regex: Too fragile for HTML

### CSV Parsing
**Decision**: csv-parse library
**Rationale**: Already in use, handles edge cases well
**Implementation**: Stream parsing for large files

### Deduplication
**Decision**: Normalise names and compare
**Rationale**: Some organisations may appear in multiple sources
**Implementation**:
- Lowercase comparison
- Remove common suffixes (Council, Board, etc.)
- Manual mapping for known duplicates

## Performance Considerations
- Parallel fetching where possible (independent sources)
- Stream processing for large CSV files
- Cache parsed selectors in memory
- No specific performance requirements (FR-010)

## Testing Strategy
- Contract tests: Mock HTTP responses, verify parsing
- Integration tests: Test against real sources (may be fragile)
- Snapshot tests: Capture known-good outputs
- Handle test data for pagination scenarios

## Risk Mitigation
- Website structure changes: Defensive selector strategies
- Source unavailability: Graceful degradation, partial results
- Rate limiting: Add delays if needed
- Character encoding: UTF-8 handling for Welsh/Scottish names