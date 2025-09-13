# Research: NHS Trusts and Local Authorities Data Integration

## HTML Parsing Library Selection

**Decision**: cheerio  
**Rationale**: 
- jQuery-like API familiar to most developers
- Lightweight and fast for server-side DOM manipulation
- Better suited for scraping structured HTML content
- Already used in similar government data scrapers

**Alternatives considered**:
- node-html-parser: Faster but less feature-rich API
- puppeteer: Overkill for static HTML pages, adds complexity
- jsdom: Heavier weight, not needed for simple scraping

## NHS Provider Directory Scraping Strategy

**Decision**: Parse alphabetical HTML listing directly  
**Rationale**:
- Page structure is stable (alphabetical A-Z sections)
- Each trust is a link element with consistent formatting
- Foundation Trusts identifiable by "Foundation" in name
- No JavaScript rendering required

**Implementation approach**:
1. Fetch HTML from https://www.england.nhs.uk/publication/nhs-provider-directory/
2. Parse all anchor tags within the content area
3. Extract trust names from link text
4. Classify as Foundation Trust if name contains "Foundation"
5. Generate simple codes from names (slugified)

**Error detection**:
- Verify minimum expected count (>100 trusts)
- Check for expected HTML structure (alphabetical sections)
- Fail fast if page structure changes

## Local Authorities Scraping Strategy

**Decision**: Parse unordered list with alphabetical sections  
**Rationale**:
- Clear HTML structure with ul/li elements
- Each authority is a hyperlink with title attribute
- Alphabetical organization (A-W sections)
- URLs provide additional validation

**Implementation approach**:
1. Fetch HTML from https://uk-air.defra.gov.uk/links?view=la
2. Parse all list items within alphabetical sections
3. Extract authority name and website URL
4. Use URL domain as additional identifier
5. Infer type from name patterns (Council, Borough, etc.)

**Error detection**:
- Verify minimum expected count (>300 authorities)
- Check for alphabetical section structure
- Validate URL format for each authority
- Fail if structure deviates

## NHS Organisation Identifiers

**Research findings**:
- NHS uses ODS (Organisation Data Service) codes
- Not available in HTML listing directly
- For MVP, use slugified names as identifiers
- Future enhancement: Cross-reference with ODS API

## Local Authority Identifiers

**Research findings**:
- Local authorities have various coding systems (GSS, ONS)
- Not present in DEFRA listing
- Use combination of name + URL domain as identifier
- Type inference from name:
  - "County Council" → County
  - "Borough Council" → Borough
  - "City Council" → City
  - "District Council" → District
  - Default → Unitary

## Error Handling Strategy

**Decision**: Fail-fast approach  
**Rationale**:
- Running nightly allows quick detection
- Partial data could cause confusion
- Clear errors enable quick fixes

**Implementation**:
1. HTTP errors → Immediate failure with clear message
2. Structure changes → Fail with specific element not found
3. Count validation → Fail if below threshold
4. Log detailed context for debugging

## Dependencies

**Required packages**:
- cheerio: ^1.0.0-rc.12 (HTML parsing)
- axios: (existing - HTTP requests)

**No new major dependencies needed** - aligns with minimal dependency policy