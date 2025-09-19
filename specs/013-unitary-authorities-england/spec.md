# Feature Specification: UK Government Organisation Data Sources

**Feature Branch**: `013-unitary-authorities-england`
**Created**: 2025-01-18
**Status**: Draft
**Input**: User description: "unitary authorities: england: link on page to csv, you must retreive the page first everytime since the link will change https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/alistofunitaryauthoritiesinenglandwithageographicalmap scotland orgs can be found in https://www.mygov.scot/organisations welsh unitary authorities at: https://law.gov.wales/local-government-bodies northern ireland trust ports: https://www.infrastructure-ni.gov.uk/articles/gateways-sea-ports scottish regional transport partnerships: https://www.transport.gov.scot/our-approach/strategy/regional-transport-partnerships/ research councils from: https://www.ukri.org/councils/ northern ireland gov depts: https://www.northernireland.gov.uk/topics/government-departments national park authorities england: https://nationalparksengland.org.uk/our-members Districts in england: https://en.wikipedia.org/wiki/Districts_of_England local healthwatch organisations: https://www.healthwatch.co.uk/your-local-healthwatch/list?title= (paginated html) integrated care boards: https://www.nhs.uk/nhs-services/find-your-local-integrated-care-board/ health boards scotland health boards https://www.scot.nhs.uk/organisations/"

## Execution Flow (main)
```
1. Parse user description from Input
   � Extract 12 distinct data sources for UK government organisations
2. Extract key concepts from description
   � Identify: local government, health bodies, transport partnerships, research councils
   � Multiple UK regions: England, Scotland, Wales, Northern Ireland
3. For each unclear aspect:
   � Mark specific data extraction requirements
4. Fill User Scenarios & Testing section
   � User needs comprehensive UK public sector organisation data
5. Generate Functional Requirements
   � Each source requires specific scraping/parsing approach
   � CSV, HTML, and paginated sources identified
6. Identify Key Entities
   � Unitary Authorities, Health Boards, Transport Bodies, Research Councils
7. Run Review Checklist
   � Several aspects need clarification
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
As a data analyst working with UK public sector information, I need a comprehensive and up-to-date list of UK government organisations across all regions and sectors, so that I can identify public sector entities for analysis, compliance checking, and stakeholder mapping.

### Acceptance Scenarios
1. **Given** the aggregator is run, **When** it completes successfully, **Then** data from all 12 sources should be present in the output
2. **Given** a dynamic CSV link for English unitary authorities, **When** the aggregator runs, **Then** it should fetch the page first to get the current CSV URL
3. **Given** paginated HTML for local healthwatch organisations, **When** the aggregator processes this source, **Then** it should retrieve all pages until no more results
4. **Given** multiple regional sources (England, Scotland, Wales, NI), **When** aggregated, **Then** each organisation should retain its regional classification

### Edge Cases
- What happens when a source website is temporarily unavailable?
- How does system handle changes in website structure or URL patterns?
- What occurs when paginated sources have varying page sizes?
- How are duplicate organisations across multiple sources handled?

## Requirements

### Functional Requirements
- **FR-001**: System MUST fetch and aggregate organisation data from 12 specified UK government sources
- **FR-002**: System MUST handle dynamic CSV links by first retrieving the containing HTML page for English unitary authorities
- **FR-003**: System MUST process paginated HTML for local healthwatch organisations until all pages are retrieved
- **FR-004**: System MUST extract organisation names from each source
- **FR-005**: System MUST categorise each organisation by type (e.g., unitary authority, health board, transport partnership)
- **FR-006**: System MUST categorise each organisation by region (England, Scotland, Wales, Northern Ireland)
- **FR-007**: System MUST handle both CSV and HTML data sources
- **FR-008**: System MUST deduplicate organisations that appear in multiple sources
- **FR-009**: System MUST provide output in JSON format consistent with existing aggregator output structure
- **FR-010**: System MUST complete aggregation without specific performance constraints
- **FR-011**: System MUST handle source unavailability using the existing retry mechanism with exponential backoff

### Key Entities
- **Unitary Authority**: Local government body with single-tier administration (England, Wales)
- **Health Board/Trust**: Regional health service organisation (Scotland, integrated care boards in England)
- **Local Healthwatch**: Independent health and social care champion organisations
- **Regional Transport Partnership**: Scottish transport coordination bodies
- **Research Council**: UK Research and Innovation constituent bodies
- **Government Department**: Northern Ireland executive departments
- **National Park Authority**: Protected area management bodies in England
- **District Council**: Two-tier local government bodies in England
- **Trust Port**: Commercially operated ports in Northern Ireland

---

## Data Sources Summary

### England
1. **Unitary Authorities**: ONS website with dynamic CSV link
2. **Districts**: Wikipedia page listing
3. **National Park Authorities**: National Parks England members page
4. **Integrated Care Boards**: NHS services locator
5. **Local Healthwatch**: Paginated HTML directory

### Scotland
6. **Government Organisations**: MyGov.scot organisations directory
7. **Health Boards**: NHS Scotland organisations
8. **Regional Transport Partnerships**: Transport Scotland page

### Wales
9. **Unitary Authorities**: Law.gov.wales local government bodies

### Northern Ireland
10. **Trust Ports**: Infrastructure NI gateways page
11. **Government Departments**: Northern Ireland government topics

### UK-wide
12. **Research Councils**: UKRI councils page

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
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed