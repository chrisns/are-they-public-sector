# Feature Specification: Emergency Services and Additional Devolved Administration Data Sources

**Feature Branch**: `006-you-can-find`  
**Created**: 2025-01-13  
**Status**: Draft  
**Input**: User description: "you can find police forces from https://www.police.uk/pu/contact-us/uk-police-forces/ and the not uk ones from https://www.police.uk/pu/find-a-police-force/ fire from https://nfcc.org.uk/contacts/fire-and-rescue-services/ devolved from https://www.gov.uk/guidance/devolution-of-powers-to-scotland-wales-and-northern-ireland"

## Execution Flow (main)
```
1. Parse user description from Input
   � Identified: Police forces (UK and non-UK), Fire services, Additional devolved administration sources
2. Extract key concepts from description
   � Actors: System aggregator, data sources (web pages)
   � Actions: Fetch, parse HTML, extract organisation data
   � Data: Police forces, fire & rescue services, devolved administration entities
   � Constraints: HTML scraping from specific URLs
3. For each unclear aspect:
   → Clarified: Non-UK police forces will be included
   → Clarified: Bodies and departments will be extracted from guidance page
4. Fill User Scenarios & Testing section
   � User flows defined for emergency services aggregation
5. Generate Functional Requirements
   � Each requirement testable and measurable
6. Identify Key Entities
   � Police Force, Fire Service, Devolved Body entities identified
7. Run Review Checklist
   → All requirements clarified and ready for implementation
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
As a data analyst working with UK public sector information, I need comprehensive data about emergency services (police and fire) and additional devolved administration entities, so that I can have a complete picture of all UK public sector organisations including emergency response services and devolved government structures.

### Acceptance Scenarios
1. **Given** the aggregator is run, **When** it processes police force data sources, **Then** all UK territorial police forces should be included in the output with correct classification
2. **Given** the aggregator is run, **When** it processes fire service data sources, **Then** all UK fire and rescue services should be included in the output with correct classification
3. **Given** the aggregator encounters a police force page, **When** extracting data, **Then** it should capture force name, jurisdiction area, and website if available
4. **Given** the aggregator encounters the fire services page, **When** extracting data, **Then** it should capture service name, region, and contact information if available
5. **Given** the aggregator processes devolved administration sources, **When** new entities are found, **Then** they should be added without duplicating existing devolved entities

### Edge Cases
- What happens when the HTML structure of source pages changes?
- How does system handle police forces that cover multiple regions (e.g., British Transport Police)?
- How does system handle merged or reorganised fire services?
- What happens if a source page becomes unavailable during aggregation?
- How are Crown Dependencies (Jersey, Guernsey, Isle of Man) police forces classified?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST fetch and parse UK police forces from the police.uk UK forces page
- **FR-002**: System MUST extract police force names and classify them as emergency service organisations
- **FR-003**: System MUST include non-UK police forces from find-a-police-force page
- **FR-004**: System MUST fetch and parse fire and rescue services from NFCC contacts page
- **FR-005**: System MUST extract fire service names and classify them as emergency service organisations
- **FR-006**: System MUST handle regional variations in fire service naming (e.g., "Fire and Rescue Service", "Fire Service", "Fire Authority")
- **FR-007**: System MUST fetch devolved administration information from gov.uk guidance page
- **FR-008**: System MUST extract bodies and departments from devolution guidance
- **FR-009**: System MUST deduplicate any devolved entities that already exist in the current dataset
- **FR-010**: System MUST fail gracefully if any source page structure has changed significantly
- **FR-011**: System MUST log extraction statistics for each source (total found, successfully parsed, failures)
- **FR-012**: System MUST maintain source attribution for all extracted organisations

### Key Entities *(include if feature involves data)*
- **Police Force**: Represents a territorial or special police force with jurisdiction area, force name, and classification as emergency service
- **Fire Service**: Represents a fire and rescue service with service area, service name, and classification as emergency service  
- **Devolved Entity**: Represents additional devolved administration bodies not previously captured, with name, jurisdiction (Scotland/Wales/NI), and governmental role

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

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

---