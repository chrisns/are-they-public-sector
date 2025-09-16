# Feature Specification: Replace GIAS School Data Collection Method

**Feature Branch**: `011-i-have-found`
**Created**: 2025-09-16
**Status**: Draft
**Input**: User description: "i have found a better way to get the GIAS school data than scraping the json, so strip all of that out and read how I've done it with test/gias.js which proves how to get everything out that way which should speed up data collection enormously"

## Execution Flow (main)
```
1. Parse user description from Input
   � Extract: Replace GIAS JSON scraping with test/gias.js approach
2. Extract key concepts from description
   � Identified: GIAS data, performance improvement, CSV extraction
3. For each unclear aspect:
   � No major ambiguities - implementation example provided
4. Fill User Scenarios & Testing section
   � Performance improvement and data completeness scenarios defined
5. Generate Functional Requirements
   � Each requirement testable and focused on outcome
6. Identify Key Entities (if data involved)
   � School data entity defined
7. Run Review Checklist
   � All sections complete
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a data aggregator system, I need to fetch UK school data from GIAS more efficiently so that the overall aggregation process completes faster and with higher reliability.

### Acceptance Scenarios
1. **Given** the aggregator needs school data, **When** the GIAS data fetch is triggered, **Then** complete school dataset should be obtained in under 30 seconds
2. **Given** GIAS data is being fetched, **When** the download completes, **Then** all UK schools data should be available in CSV format with all fields intact
3. **Given** existing GIAS JSON scraping code exists, **When** the new approach is implemented, **Then** the old scraping code should be completely removed
4. **Given** the new GIAS fetcher is running, **When** network issues occur, **Then** appropriate error messages should indicate the failure reason

### Edge Cases
- What happens when GIAS service is temporarily unavailable?
- How does system handle rate limiting or bot detection?
- What occurs if the CSV format changes unexpectedly?
- How does the system respond to partial downloads or corrupted data?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST fetch complete UK schools dataset from GIAS service
- **FR-002**: System MUST extract CSV data from downloaded ZIP file automatically
- **FR-003**: System MUST complete the entire GIAS data fetch within 30 seconds under normal conditions
- **FR-004**: System MUST remove all existing JSON scraping code for GIAS
- **FR-005**: System MUST handle session management and authentication tokens automatically
- **FR-006**: System MUST provide clear error messages when data fetch fails
- **FR-007**: System MUST parse extracted CSV data into the existing school data format
- **FR-008**: System MUST maintain compatibility with the rest of the aggregation pipeline
- **FR-009**: System MUST handle compressed responses (gzip, deflate, br) transparently
- **FR-010**: System MUST validate that downloaded data contains expected number of schools (approximately 52,000 records)

### Key Entities
- **School Data**: Complete UK schools dataset containing all GIAS fields including URN, name, type, status, location, and administrative details
- **Download Session**: Temporary session state including cookies, CSRF tokens, and download UUID
- **CSV Extract**: Uncompressed comma-separated values file containing all school records

---

## Review & Acceptance Checklist

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found - example code provided)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---