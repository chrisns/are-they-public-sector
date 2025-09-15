# Research: Northern Ireland Schools Data Integration

## Overview
Research findings for integrating Northern Ireland schools data from the NI Education Department into the UK Public Sector Organisation Aggregator.

## Data Source Analysis

### Decision: Two-Phase HTTP Request Pattern
**Rationale**: The NI Education Department website uses ASP.NET WebForms which requires ViewState and EventValidation tokens for form submissions. This is a stateful interaction pattern common in older .NET applications.

**Alternatives considered**:
- Direct API access: Not available from NI Education Department
- Web scraping tables: Would miss export functionality and be less reliable
- Manual download: Not suitable for automated nightly runs

### Technical Approach

#### Phase 1: Token Retrieval
- **URL**: `https://apps.education-ni.gov.uk/appinstitutes/default.aspx`
- **Method**: GET request to retrieve initial page
- **Extraction**: Parse HTML for `__VIEWSTATE` and `__EVENTVALIDATION` hidden input values
- **Tools**: cheerio for HTML parsing (jQuery-like selectors)

#### Phase 2: Data Export
- **URL**: Same as Phase 1
- **Method**: POST request with form data
- **Required Parameters**:
  - `__EVENTTARGET`: `ctl00$ContentPlaceHolder1$lvSchools$btnDoExport`
  - `__VIEWSTATE`: URL-encoded token from Phase 1
  - `__EVENTVALIDATION`: URL-encoded token from Phase 1
  - `ctl00$ContentPlaceHolder1$instType`: `-1` (all types)
  - `ctl00$ContentPlaceHolder1$instStatus`: `0` (open schools only)
  - `ctl00$ContentPlaceHolder1$lvSchools$exportType`: `2` (Excel format)
- **Response**: Excel file (XLSX) with school data

## Data Format Research

### Excel Structure
**Decision**: Parse XLSX format using xlsx library
**Rationale**:
- Native export format from the source
- Preserves all metadata and formatting
- Well-supported by xlsx library in TypeScript

**Expected columns** (based on similar government data exports):
- School Name
- School Type (Primary, Post-Primary, Special, Nursery)
- Management Type (Controlled, Voluntary, Integrated, etc.)
- Address fields
- Contact information
- Status information

### Data Validation

**Count Validation**:
- Expected: ~1122 schools (as shown on website)
- Tolerance: ±10% to account for normal changes
- Action on failure: Fail fast with clear error message

**Field Validation**:
- Required fields: Name, Type, Status
- Optional fields: All other metadata
- Empty field handling: Preserve as null/undefined

## Integration Patterns

### Decision: Fail-Fast Error Handling
**Rationale**:
- Matches existing pattern in codebase (NHS, Local Authorities)
- Suitable for nightly batch runs
- Clear failure signals for monitoring

**Implementation**:
- Network errors → immediate failure
- Format changes → immediate failure
- Count validation failure → immediate failure
- Missing required fields → immediate failure

### Decision: Direct Service Implementation
**Rationale**:
- Follows existing codebase patterns
- No need for abstraction layers
- Simplifies testing and debugging

**Pattern**:
1. Parser service for data fetching and parsing
2. Mapper service for Organisation transformation
3. Integration into existing orchestrator

## Performance Considerations

### Network Optimization
- **Timeouts**: 30 seconds for initial page, 60 seconds for export
- **Retries**: 3 attempts with exponential backoff
- **User-Agent**: Standard browser string to avoid blocking

### Processing Optimization
- **Memory**: Stream Excel processing if file >10MB
- **Validation**: Fail fast on first critical error
- **Logging**: Structured logs for each phase

## Security Considerations

### Token Handling
- Tokens are session-specific and temporary
- No credentials or API keys required
- Standard form submission pattern

### Data Privacy
- Public data only (school directory information)
- No personal or sensitive information
- Complies with existing data handling policies

## Testing Strategy

### Contract Tests
- Mock HTTP responses for token retrieval
- Mock Excel file for parser testing
- Validate Organisation output format

### Integration Tests
- Real HTTP calls to verify endpoint availability
- Sample Excel parsing with known data
- End-to-end flow validation

### Edge Cases to Test
- Empty ViewState/EventValidation tokens
- Malformed HTML response
- Invalid Excel format
- Missing required columns
- Count validation boundaries (±10%)
- Network timeouts
- Server errors (500, 503)

## Dependencies

### Existing Dependencies (Reuse)
- axios: HTTP client for requests
- cheerio: HTML parsing for tokens
- xlsx: Excel file parsing

### No New Dependencies Required
The existing dependency set covers all requirements for this feature.

## Risks and Mitigations

### Risk: Website Structure Changes
**Mitigation**: Fail-fast validation of HTML structure, clear error messages

### Risk: Export Format Changes
**Mitigation**: Column mapping validation, fail on missing required fields

### Risk: Rate Limiting
**Mitigation**: Single sequential request pattern, appropriate delays

### Risk: Service Availability
**Mitigation**: Retry logic with backoff, clear timeout handling

## Conclusion

All technical decisions are resolved. The approach follows existing patterns in the codebase and uses established dependencies. The two-phase HTTP request pattern with token extraction is well-understood and reliable for ASP.NET WebForms integration.