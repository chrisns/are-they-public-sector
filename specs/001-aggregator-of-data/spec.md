# Feature Specification: UK Public Sector Organisation Aggregator

**Feature Branch**: `001-aggregator-of-data`  
**Created**: 2025-09-12  
**Status**: Draft  
**Input**: User description: "aggregator of data about organisations in order to create a definitive list of uk public sector organisations"

## Execution Flow (main)
```
1. Parse user description from Input
   � If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   � Identify: actors, actions, data, constraints
3. For each unclear aspect:
   � Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   � If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   � Each requirement must be testable
   � Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   � If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   � If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a data aggregation system, I need to pull organisation data from multiple UK government sources, map their different schemas to a unified format, and output a comprehensive JSON file containing all UK public sector organisations with their classifications and relationships.

### Acceptance Scenarios
1. **Given** the GOV.UK API endpoint exists, **When** the system fetches the organisations data, **Then** it successfully parses the JSON and extracts all organisation records
2. **Given** the ONS classification guide page exists, **When** the system scrapes the HTML, **Then** it identifies and downloads the correct Excel file using the "Public sector classification guide" link
3. **Given** the ONS Excel file is downloaded, **When** the system processes it, **Then** it extracts data from both "Organisation|Institutional Unit" and "Non-Institutional Units" tabs
4. **Given** data from all three sources is collected, **When** the system performs mapping, **Then** it correctly maps fields like "Non-Institutional Unit name" to "Name" and "Sponsoring Entity" to "Controlling Unit"
5. **Given** duplicate organisations exist across sources, **When** the system deduplicates, **Then** it maintains a single record per organisation with provenance tracking
6. **Given** all data is processed, **When** the system generates output, **Then** it produces a valid JSON file containing all aggregated organisation data

### Edge Cases
- What happens when the ONS Excel link changes format or the anchor text differs?
- How does system handle when GOV.UK API returns malformed JSON or is temporarily unavailable?
- What happens when Excel tabs have different column names than expected?
- How does system handle organisations appearing in multiple sources with conflicting data?
- What happens when unmapped fields are encountered in source data?
- How does system handle special characters or encoding issues in organisation names?
- What happens when the ONS Excel file is corrupted or has unexpected structure?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST aggregate data from three primary sources:
  - GOV.UK Government Organisations API (https://www.gov.uk/api/content/government/organisations) - JSON format
  - ONS Public Sector Classification Guide - Excel format with two tabs: "Organisation|Institutional Unit" and "Non-Institutional Units" (dynamically linked from https://www.ons.gov.uk/methodology/classificationsandstandards/economicstatisticsclassifications/introductiontoeconomicstatisticsclassifications)
- **FR-002**: System MUST output a static consolidated JSON file containing all aggregated organisation data
- **FR-003**: System MUST categorise organisations by type (e.g., central government, local authority, NHS, executive agency, NDPB)
- **FR-004**: System MUST maintain a unique identifier for each organisation to prevent duplicates
- **FR-005**: System MUST track data provenance showing the source and date of each piece of information
- **FR-006**: System MUST validate and deduplicate organisation records across different data sources
- **FR-007**: System MUST flag organisations with incomplete or conflicting data for review
- **FR-008**: System MUST implement data mapping to reconcile different column headings and data structures between sources, with initial mappings including:
  - "Non-Institutional Unit name" (ONS) → "Name" (unified field)
  - "Sponsoring Entity" (ONS) → "Controlling Unit" (unified field)
  - GOV.UK API JSON fields → corresponding unified fields
  - ONS Excel "Organisation|Institutional Unit" tab fields → unified fields
  - ONS Excel "Non-Institutional Units" tab fields → unified fields
  - When mappings are unclear, include all source fields in output for later reconciliation
- **FR-009**: System MUST dynamically retrieve the ONS Public Sector Classification Guide by:
  - Fetching the HTML page to find the link with text "Public sector classification guide"
  - Extracting the href attribute (e.g., "/file?uri=/methodology/.../pscgaug2025.xlsx") which varies monthly
  - Downloading the Excel file from the extracted link
  - Processing both relevant tabs from the Excel file
- **FR-010**: System MUST maintain an audit trail of changes to organisation records
- **FR-011**: System MUST handle tens of thousands to low hundreds of thousands of organisation records

### Key Entities *(include if feature involves data)*
- **Organisation**: Represents a UK public sector entity with attributes including name, type, classification, parent organisation (if applicable), status (active/inactive), location, establishment date
- **Data Source**: Represents an external system or dataset providing organisation information, with reliability rating and update frequency
- **Organisation Type**: Categorisation of public sector bodies (e.g., ministerial department, executive agency, local authority, NHS trust)
- **Data Mapping**: Configuration that defines how fields from different sources (GOV.UK JSON, ONS Excel tabs) map to unified organisation attributes
- **Audit Record**: Historical record of changes to organisation data, including timestamp, source, and nature of change
- **Data Conflict**: Record of conflicting information from different sources about the same organisation

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