# Feature Specification: Add UK Colleges (Scotland, Wales, Northern Ireland)

**Feature Branch**: `007-we-re-already`
**Created**: 2025-09-15
**Status**: Draft
**Input**: User description: "we're already pulling colleges in england, but we're missing scotland, wales and northern ireland. you can find these in pdfs that are linked to from https://www.aoc.co.uk/about/list-of-colleges-in-the-uk it is essential to retrief the page first each time because the URLs of the pdfs will change, you can then extract the data from the PDFs. you'll know you've done it correctly when you've extracted the same number of colleges from the pdf as are displayed on the webpage"

## Execution Flow (main)
```
1. Parse user description from Input
   � SUCCESS: Need to add colleges from Scotland, Wales, and Northern Ireland
2. Extract key concepts from description
   � Actors: System aggregator
   � Actions: Fetch webpage, extract PDF links, download PDFs, parse PDF data
   � Data: College information from PDFs
   � Constraints: Must fetch webpage first (dynamic URLs), validate count matches webpage
3. For each unclear aspect:
   � Data format in PDFs needs investigation
   � Specific college attributes to extract need definition
4. Fill User Scenarios & Testing section
   � SUCCESS: Clear user flow defined
5. Generate Functional Requirements
   � SUCCESS: 8 testable requirements generated
6. Identify Key Entities
   � College entity defined with attributes
7. Run Review Checklist
   � WARN: Some clarifications needed on data attributes
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
As a data aggregator operator, I want to include colleges from Scotland, Wales, and Northern Ireland in our comprehensive UK public sector dataset, so that users have complete coverage of UK further education institutions alongside the English colleges we already collect.

### Acceptance Scenarios
1. **Given** the aggregator is run with all sources enabled, **When** the process completes, **Then** colleges from Scotland, Wales, and Northern Ireland are included in the output alongside English colleges
2. **Given** the AoC webpage lists a specific number of colleges for each region, **When** the PDFs are parsed, **Then** the extracted count must match the displayed count on the webpage
3. **Given** the PDF URLs change periodically, **When** the aggregator runs, **Then** it must fetch the current webpage first to get the latest PDF links
4. **Given** a PDF download fails, **When** the aggregator encounters this error, **Then** it must fail-fast and report which region's colleges could not be retrieved

### Edge Cases
- What happens when the AoC webpage structure changes? System must fail-fast with clear error message
- How does system handle when PDF format changes? System must detect format change and fail-fast
- What happens when college counts don't match? System must fail validation and report discrepancy
- How does system handle network failures during PDF download? System must retry with exponential backoff, then fail-fast

## Requirements

### Functional Requirements
- **FR-001**: System MUST fetch the AoC colleges webpage (https://www.aoc.co.uk/about/list-of-colleges-in-the-uk) before attempting to download PDFs
- **FR-002**: System MUST extract PDF download links for Scotland, Wales, and Northern Ireland from the webpage
- **FR-003**: System MUST download and parse PDF documents for each region (Scotland, Wales, Northern Ireland)
- **FR-004**: System MUST extract college names from PDF tables (PDFs contain tables with college names only, no additional details)
- **FR-005**: System MUST validate that the count of colleges extracted from each PDF matches the count displayed on the webpage for that region
- **FR-006**: System MUST integrate the extracted colleges with existing English colleges data in the unified output format
- **FR-007**: System MUST fail-fast if webpage structure changes, PDF format changes, or validation fails
- **FR-008**: System MUST map extracted college data to the standard Organisation schema used throughout the application

### Key Entities
- **College**: Represents a further education institution in Scotland, Wales, or Northern Ireland
  - Name (required - only data available from PDFs)
  - Region/Country (Scotland/Wales/Northern Ireland - derived from source PDF)
  - Source metadata (PDF URL, extraction date)

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

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---