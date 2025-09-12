# Research Findings: Fix Organization Count Discrepancies

**Date**: 2025-09-12  
**Feature**: 002-the-current-implementation

## Issue Analysis

### Current State
The aggregator is currently returning **0 organizations** from all sources:
- GOV.UK API: 0 (expected 611)
- ONS Institutional Units: 0 (expected 3360)
- ONS Non-Institutional Units: 0 (expected 57)

### Root Causes Identified

#### 1. GOV.UK API Issue
- **Decision**: The API returns paginated results, but pagination is not being handled correctly
- **Rationale**: The fetcher looks for `next_page_url` but GOV.UK API likely uses different pagination field names
- **Alternatives considered**: 
  - Direct URL fetching without pagination (would miss records)
  - Using a different API endpoint (no alternative exists)

#### 2. ONS Excel Parsing Issues
- **Decision**: Excel sheet names don't match expected patterns
- **Rationale**: The parser looks for sheets matching `/institutional|organisation/i` and `/non.?institutional/i` but actual sheet names differ
- **Alternatives considered**:
  - Hardcoding sheet indices (fragile if structure changes)
  - Manual sheet name configuration (requires user intervention)

#### 3. ONS Excel URL Issue
- **Decision**: The scraper is finding an old Excel file (.xls) instead of the current one (.xlsx)
- **Rationale**: The fallback pattern is too broad and matches the first Excel file found
- **Alternatives considered**:
  - Hardcoding the Excel URL (would break when ONS updates)
  - Using only the primary scraping pattern (might miss the file)

## Technical Decisions

### GOV.UK API Pagination
- **Approach**: Check actual API response structure and field names
- **Implementation**: Update pagination logic to match actual API response format
- **Expected fields**: May use `links.next`, `next`, or `page` parameters

### ONS Excel Sheet Detection
- **Approach**: List all sheet names first, then use more flexible matching
- **Implementation**: Log sheet names for debugging, update regex patterns
- **Expected sheets**: 
  - "Organisation|Institutional Unit" (exact match needed)
  - "Non-Institutional Units" (exact match needed)

### ONS Excel URL Scraping
- **Approach**: Prioritize .xlsx files and most recent classification guide
- **Implementation**: Update scraping patterns to be more specific
- **Pattern priority**:
  1. Links with "Public sector classification guide" text
  2. .xlsx files with "pscg" in filename
  3. Most recent Excel file by date pattern

## Data Source Specifications

### GOV.UK API
- **Endpoint**: `https://www.gov.uk/api/organisations`
- **Response format**: JSON with pagination
- **Expected count**: 611 organizations
- **Key fields**: title, format, slug, web_url

### ONS Excel Structure
- **File format**: .xlsx (not .xls)
- **Tab 1**: "Organisation|Institutional Unit" - 3360 records
- **Tab 2**: "Non-Institutional Units" - 57 records
- **Key fields**: Organisation name, ONS code, Classification, Parent organisation

## Implementation Strategy

### Phase 1: Fix Data Fetching
1. Update GOV.UK API pagination handling
2. Fix ONS Excel URL scraping to find correct file
3. Update sheet name patterns for Excel parsing

### Phase 2: Validate Parsing
1. Add detailed logging for debugging
2. Validate field mapping for each source
3. Ensure all records are captured

### Phase 3: Count Verification
1. Add count assertions after each fetch
2. Log warnings if counts don't match expectations
3. Provide detailed error messages

## Risk Mitigation

### API Changes
- Monitor for GOV.UK API structure changes
- Implement flexible field mapping
- Add response validation

### Excel Structure Changes
- Log all sheet names for debugging
- Use flexible column name matching
- Preserve unmapped fields for future use

### Performance Considerations
- Stream processing for large datasets
- Pagination handling for API calls
- Memory-efficient Excel parsing

## Success Metrics
- GOV.UK API returns exactly 611 organizations
- ONS Institutional Units tab returns exactly 3360 organizations
- ONS Non-Institutional Units tab returns exactly 57 organizations
- Total output contains 4028 unique organizations
- All data fields are preserved during aggregation