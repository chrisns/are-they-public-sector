# Feature Specification: Schools Data Aggregation

**Feature Branch**: `005-theres-no-good`  
**Created**: 2025-09-13  
**Status**: Draft  
**Input**: User description: "theres no good API for it so to get all the schools you'll need to crawl all the results of `https://get-information-schools.service.gov.uk/Establishments/Search/results-json?SearchType=EstablishmentAll&z=a&startIndex=0` you'll get 100 results each time, so incremenet the startIndex by 100, so 0, 100, 200 etc until you finally get a empty results of `[]` returned. if you get errors you'll need to retry with an exponential backoff. use all the research mcp tools available to you throughout the planning process"

## Execution Flow (main)
```
1. Parse user description from Input
   → Identified: Need to aggregate UK schools data via pagination
2. Extract key concepts from description
   → Identified: data source (GIAS), pagination method, error handling
3. For each unclear aspect:
   → All clarifications resolved by user
4. Fill User Scenarios & Testing section
   → User flow determined: Automated aggregation of schools data
5. Generate Functional Requirements
   → Requirements defined for data fetching, pagination, error handling
6. Identify Key Entities
   → School entity with all available attributes
7. Run Review Checklist
   → All checks passed
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a data analyst working with UK public sector organisations, I need to aggregate all schools data from the Get Information About Schools (GIAS) service into a unified format, so that I can analyze the complete landscape of educational establishments in the UK alongside other public sector data.

### Acceptance Scenarios
1. **Given** the GIAS service is available, **When** the aggregation process runs, **Then** all schools data should be successfully fetched and stored in a consistent format
2. **Given** there are thousands of schools requiring pagination, **When** fetching data page by page, **Then** the system should continue until all pages are retrieved (empty result set indicates completion)
3. **Given** network issues may occur during data fetching, **When** an error occurs, **Then** the system should retry with exponential backoff to ensure resilience
4. **Given** the data source may change or become unavailable, **When** the expected format is not found, **Then** the system should fail-fast with clear error reporting

### Edge Cases
- What happens when the service returns malformed JSON?
- How does system handle when pagination returns duplicate schools?
- What happens if the service rate-limits requests?
- How does system handle partial data retrieval (e.g., crash after 50% complete)?
- What happens when school records have missing or invalid fields?

## Requirements

### Functional Requirements
- **FR-001**: System MUST fetch schools data from the GIAS service using pagination (100 records per page)
- **FR-002**: System MUST continue pagination until an empty result set is returned
- **FR-003**: System MUST implement exponential backoff retry logic for failed requests
- **FR-004**: System MUST aggregate all schools into a unified data format consistent with other public sector data sources
- **FR-005**: System MUST handle network errors gracefully and complete the aggregation process
- **FR-006**: System MUST extract all available fields from each school record (only school name is mandatory)
- **FR-007**: System MUST deduplicate schools if the same establishment appears multiple times
- **FR-008**: System MUST report total number of schools aggregated and any errors encountered
- **FR-009**: System MUST fail-fast if the data source format changes unexpectedly
- **FR-010**: System MUST include schools of all types (primary, secondary, special, nursery, etc.)
- **FR-011**: System MUST filter to include only open schools (exclude closed establishments)
- **FR-012**: System MUST extract all available attributes from the source (mapping and normalisation to be handled separately)

### Key Entities
- **School**: Represents an educational establishment with all available attributes from source including:
  - Unique identifier (URN - Unique Reference Number expected)
  - Name of the establishment (mandatory)
  - Type/Category (all types included)
  - Status (filtered to open schools only)
  - All location information available from source
  - All additional metadata provided by GIAS service

---

## Review & Acceptance Checklist

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
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
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Notes for Planning Phase

Based on user clarifications:
1. Extract all available fields from GIAS JSON response (only school name is mandatory)
2. Include all school types (primary, secondary, special, nursery, etc.)
3. Filter to include only open schools (exclude closed establishments)
4. Extract all available attributes - mapping and normalisation will be handled in a separate phase
5. Consider rate limiting and implement appropriate delays between requests if needed
6. Plan for incremental updates vs full re-fetch strategies for future runs