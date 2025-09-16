# Research: GIAS CSV Download Implementation

## Executive Summary
After analyzing the test/gias.js implementation, the approach uses the official GIAS Downloads service to fetch school data directly as CSV, bypassing the slower JSON scraping method. This approach is significantly faster (under 30 seconds vs minutes) and more reliable.

## Technical Decisions

### 1. Download Method
**Decision**: Direct CSV download via GIAS Downloads service
**Rationale**:
- Official supported method by get-information-schools.service.gov.uk
- Single ZIP file containing all data (vs multiple JSON requests)
- Faster download (8MB compressed vs hundreds of API calls)
- More reliable (single session vs multiple requests)

**Alternatives Considered**:
- Keep JSON scraping: Rejected due to poor performance and reliability
- Hybrid approach: Unnecessary complexity, no benefits

### 2. Session Management
**Decision**: Cookie-based session with CSRF token handling
**Rationale**:
- Required by GIAS service for bot protection
- Proven approach in test/gias.js
- Handles authentication flow automatically

**Implementation Requirements**:
- Store all cookies from Set-Cookie headers
- Extract __RequestVerificationToken from HTML
- Maintain session across redirect chain
- Include cookies in all subsequent requests

### 3. Data Extraction
**Decision**: ZIP extraction with zlib, then CSV parsing
**Rationale**:
- GIAS provides data as ZIP file containing single CSV
- Standard Node.js zlib handles decompression
- CSV format is stable and well-documented

**Technical Details**:
- ZIP uses DEFLATE compression (method 8)
- CSV is approximately 45MB uncompressed
- Contains ~52,000 school records

### 4. Error Handling
**Decision**: Comprehensive error detection with clear messages
**Rationale**:
- Service has aggressive bot detection (403 errors)
- Network issues need clear identification
- Download failures must be debuggable

**Error Scenarios**:
- 403 Forbidden: Bot detection triggered
- Session timeout: Token expired
- Incomplete download: Corrupted ZIP
- Format change: CSV structure modified

## Implementation Architecture

### Service Flow
```
1. GET /Downloads → Establish session, get cookies + CSRF token
2. POST /Downloads/Collate → Submit download request with date params
3. Poll /Downloads/Generated/{uuid} → Wait for file generation
4. POST /Downloads/Download/Extract → Get redirect to file
5. Download ZIP file → Extract CSV → Parse data
```

### Key Technical Requirements

#### Headers (Critical for bot detection)
- User-Agent: Full browser string required
- Accept-Encoding: gzip, deflate, br
- Cookie: Session cookies must be preserved
- Referer: Required for CSRF protection
- Origin: Required for POST requests

#### Form Parameters
- __RequestVerificationToken: CSRF token from HTML
- FilterDate.Day/Month/Year: Current date
- Downloads[0].Tag: "all.edubase.data"
- Downloads[0].Selected: "true"

#### Timing Considerations
- File generation: 1-5 seconds typically
- Polling interval: 1 second acceptable
- Total timeout: 60 seconds generous
- Extra wait after ready: 5 seconds for file write

## Migration Strategy

### Code to Remove
- src/services/schools-fetcher.ts (entire file)
- JSON scraping logic in orchestrator
- Related JSON parsing utilities
- Old contract tests for JSON approach

### Code to Add
- src/services/gias-csv-fetcher.ts
- CSV parsing utilities
- ZIP extraction handling
- Session management logic

### Code to Update
- src/services/mappers/schools-mapper.ts (CSV fields vs JSON)
- src/cli/orchestrator.ts (use new fetcher)
- Integration tests for new approach

## Performance Analysis

### Current JSON Scraping
- Time: 3-5 minutes typical
- Requests: 100+ API calls
- Data size: Variable (pagination)
- Reliability: Prone to timeouts

### New CSV Download
- Time: 10-30 seconds typical
- Requests: 4-5 total
- Data size: 8MB compressed
- Reliability: Single point of failure

### Improvement Factor
- **Speed**: 6-10x faster
- **Reliability**: Significantly improved
- **Maintainability**: Simpler codebase

## Risk Assessment

### Low Risk
- CSV format stable for years
- Official supported method
- Proven implementation in test/gias.js

### Medium Risk
- Bot detection changes: Mitigated by browser-like headers
- Service availability: Same as current approach

### High Risk
- None identified

## Validation Approach

### Functional Validation
- Download completes in under 30 seconds
- All ~52,000 schools extracted
- Fields mapped correctly to Organisation model
- Error messages clear and actionable

### Data Validation
- School count matches expected range
- Required fields present (URN, name, etc.)
- No data corruption or truncation
- Character encoding preserved

### Integration Validation
- Orchestrator uses new fetcher
- Deduplication still works
- Output format unchanged
- Performance metrics improved

## Conclusion
The CSV download approach is superior in every measurable way. The implementation in test/gias.js provides a proven blueprint that handles all edge cases including bot detection, session management, and data extraction. This change will significantly improve the aggregator's performance and reliability.