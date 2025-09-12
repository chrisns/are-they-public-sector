# Feature Specification: Fix Organization Count Discrepancies in Data Aggregator

**Feature Branch**: `002-the-current-implementation`  
**Created**: 2025-09-12  
**Status**: Draft  
**Input**: User description: "the current implementation isn't returning any orgs. so lets clarify the gov.uk endpoint should be exactly 611 and the excel ons doc should give exactly 3360 from the `Organisation|Institutional Unit` tab and 57 from the `Non-Institutional Units` tab"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Issue: Aggregator returns 0 organizations instead of expected counts
2. Extract key concepts from description
   ’ Data sources: GOV.UK API, ONS Excel document
   ’ Expected counts: 611 from GOV.UK, 3360 from Institutional Units, 57 from Non-Institutional
3. For each unclear aspect:
   ’ All requirements clear from input
4. Fill User Scenarios & Testing section
   ’ User expects combined total of 4028 organizations
5. Generate Functional Requirements
   ’ Each source must return specific counts
   ’ All organizations must be included in output
6. Identify Key Entities
   ’ Organizations from three distinct sources
7. Run Review Checklist
   ’ Ready for implementation
8. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a data analyst working with UK public sector data, I need the aggregator tool to correctly fetch and combine organization data from all configured sources so that I have a complete and accurate dataset of all UK public sector organizations.

### Acceptance Scenarios
1. **Given** the aggregator is run with default configuration, **When** it fetches data from GOV.UK API, **Then** it must retrieve exactly 611 organizations
2. **Given** the aggregator is run with default configuration, **When** it processes the ONS Excel document's "Organisation|Institutional Unit" tab, **Then** it must extract exactly 3360 organizations
3. **Given** the aggregator is run with default configuration, **When** it processes the ONS Excel document's "Non-Institutional Units" tab, **Then** it must extract exactly 57 organizations
4. **Given** all data sources are successfully fetched, **When** the aggregation is complete, **Then** the output file must contain exactly 4028 unique organizations (611 + 3360 + 57)
5. **Given** the aggregator has completed processing, **When** checking the output file, **Then** organizations from all three sources must be present with their respective data fields

### Edge Cases
- What happens when the GOV.UK API returns fewer than 611 organizations?
- How does system handle if the Excel tabs have different names or structures?
- What happens if duplicate organizations exist across sources?
- How does system report if expected counts don't match actual counts?

## Requirements

### Functional Requirements
- **FR-001**: System MUST correctly fetch all 611 organizations from the GOV.UK API endpoint
- **FR-002**: System MUST correctly parse all 3360 organizations from the ONS Excel "Organisation|Institutional Unit" tab
- **FR-003**: System MUST correctly parse all 57 organizations from the ONS Excel "Non-Institutional Units" tab
- **FR-004**: System MUST include all 4028 organizations in the final output file (dist/orgs.json)
- **FR-005**: System MUST preserve all data fields from each source during aggregation
- **FR-006**: System MUST report the count of organizations retrieved from each source
- **FR-007**: System MUST produce valid JSON output containing all aggregated organizations
- **FR-008**: System MUST NOT drop or skip any organizations during processing
- **FR-009**: System MUST log warnings if actual counts differ from expected counts (611, 3360, 57)

### Key Entities
- **Organization**: A UK public sector entity with attributes from one or more data sources
- **GOV.UK Organization**: Organization data from the GOV.UK API (expected: 611 entities)
- **Institutional Unit**: Organization from ONS Excel "Organisation|Institutional Unit" tab (expected: 3360 entities)
- **Non-Institutional Unit**: Organization from ONS Excel "Non-Institutional Units" tab (expected: 57 entities)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
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
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---