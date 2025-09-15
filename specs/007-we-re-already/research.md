# Research: UK Colleges Data Sources

## Overview
Research findings for adding Scotland, Wales, and Northern Ireland colleges from AoC (Association of Colleges) PDFs.

## Key Findings

### 1. AoC Webpage Structure
**Decision**: Use cheerio for HTML parsing
**Rationale**:
- jQuery-like API matches existing patterns in codebase
- Already used for NHS and Local Authority parsers
- Reliable selector-based extraction

**Alternatives considered**:
- Puppeteer: Overkill for static HTML
- Regex parsing: Too fragile for HTML

**Implementation notes**:
- URL: https://www.aoc.co.uk/about/list-of-colleges-in-the-uk
- Webpage contains college counts per region
- PDF links are dynamic and change periodically
- Must extract both PDF URLs and displayed counts for validation

### 2. PDF Parsing Approach
**Decision**: Use pdf-parse library
**Rationale**:
- Mature library with 2M+ weekly downloads
- Simple API for text extraction
- Handles table structures in PDFs
- Pure JavaScript, no native dependencies

**Alternatives considered**:
- pdfjs-dist: More complex API, designed for rendering
- pdf2json: Less reliable for table extraction
- pdf-table-extractor: Abandoned, last update 2019

**Implementation notes**:
- PDFs contain tables with college names
- No additional metadata (addresses, types, etc.)
- Text extraction sufficient, no need for layout preservation
- Must handle varying table formats across regions

### 3. Validation Strategy
**Decision**: Fail-fast with count validation
**Rationale**:
- Ensures data integrity
- Catches format changes immediately
- Aligns with existing parser patterns

**Implementation**:
- Extract displayed count from webpage
- Count parsed colleges from PDF
- Fail if counts don't match
- Clear error messages for debugging

### 4. Integration Pattern
**Decision**: Follow existing parser pattern
**Rationale**:
- Consistency with NHS, Police, Fire parsers
- Established error handling
- Familiar to maintainers

**Structure**:
```typescript
class CollegesParser {
  async aggregate(): Promise<CollegesResult> {
    // 1. Fetch webpage
    // 2. Extract PDF links and counts
    // 3. Download PDFs
    // 4. Parse college names
    // 5. Validate counts
    // 6. Return results
  }
}
```

### 5. Error Handling
**Decision**: Fail-fast on any error
**Rationale**:
- Data quality over partial results
- Nightly runs can retry
- Clear errors for investigation

**Error scenarios**:
- Webpage structure changed
- PDF download failed
- PDF format changed
- Count validation failed

### 6. Data Model
**Decision**: Minimal College entity
**Rationale**:
- PDFs only contain names
- Region derived from source PDF
- Matches requirement constraints

**Fields**:
- name: string (from PDF)
- region: 'Scotland' | 'Wales' | 'Northern Ireland'
- source: metadata (URL, fetchedAt)

## Dependencies

### New Dependencies
- **pdf-parse**: ^1.1.1
  - Purpose: Parse PDF documents
  - License: MIT
  - Size: ~50KB

### Existing Dependencies (to reuse)
- **axios**: HTTP requests
- **cheerio**: HTML parsing
- **exponential-backoff**: Retry logic

## Performance Considerations
- PDF files typically 100-500KB each
- 3 regions = 3 PDFs to download
- Sequential processing acceptable (avoid rate limiting)
- Target: <30 seconds total processing time

## Testing Strategy
- Contract tests with saved webpage HTML
- Contract tests with sample PDFs
- Integration test with real sources (CI only)
- Unit tests for mapper logic

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Webpage redesign | High | Fail-fast, monitor alerts |
| PDF format change | High | Contract tests detect changes |
| Network failures | Medium | Exponential backoff retry |
| Rate limiting | Low | Sequential requests, delays |

## Conclusion
Ready to proceed with implementation using:
- cheerio for webpage parsing
- pdf-parse for PDF extraction
- Fail-fast validation approach
- Existing parser patterns