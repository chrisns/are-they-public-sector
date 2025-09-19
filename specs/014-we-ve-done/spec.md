# Feature Specification: Project Publication and Documentation Update

**Feature Branch**: `014-we-ve-done`
**Created**: 2025-09-19
**Status**: Draft
**Input**: User description: "we've done an awful lot of work, but some of the documentaiton has drifted from the code, and the readme needs some love to update it. I want to get this ready to publish to chrisns/are-they-public-sector on a MIT licence with github actions to test and then run the compile script and publish the result to github pages, i also want a nice website that allows you to search and explore the data from the statcic orgs.json file"

## Execution Flow (main)
```
1. Parse user description from Input
   � Extracted: documentation update, MIT license, GitHub publish, CI/CD, searchable website
2. Extract key concepts from description
   � Actors: developers, data consumers, website visitors
   � Actions: search, explore, filter, view details
   � Data: orgs.json (59,977+ organisations)
   � Constraints: static hosting, GitHub Pages, MIT license
3. For each unclear aspect:
   � Website design preferences marked
   � Search functionality depth marked
4. Fill User Scenarios & Testing section
   � Primary flow: searching organisation data
   � Edge cases: large dataset handling
5. Generate Functional Requirements
   � Documentation, licensing, CI/CD, website features
6. Identify Key Entities
   � Organisation data, search interface, documentation
7. Run Review Checklist
   � WARN: Some design aspects need clarification
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
As a researcher or developer interested in UK public sector organisations, I want to easily search and explore a comprehensive dataset of UK public sector organisations so that I can find specific organisations, understand their relationships, and use this data for analysis or integration into other systems.

### Acceptance Scenarios
1. **Given** a visitor on the website homepage, **When** they search for "NHS", **Then** they see all NHS-related organisations with their types and locations
2. **Given** a developer viewing the repository, **When** they read the README, **Then** they understand how to run the aggregator and what data sources are included
3. **Given** the repository is pushed to GitHub, **When** a commit is made, **Then** tests run automatically and the data is regenerated if tests pass
4. **Given** a data consumer on the website, **When** they filter by organisation type "Local Authority", **Then** only local authorities are displayed
5. **Given** a visitor viewing an organisation, **When** they click on it, **Then** they see full details including sources, location, and metadata

### Edge Cases
- What happens when searching returns 1000+ results?
- How does the website handle the 70MB+ JSON file loading?
- What happens if the GitHub Action fails during data compilation?
- How are users notified when data was last updated?

## Requirements

### Functional Requirements

#### Documentation & Licensing
- **FR-001**: README MUST accurately describe the project purpose, data sources, and organisation count
- **FR-002**: README MUST include clear instructions for running the aggregator locally
- **FR-003**: Repository MUST include MIT license file with proper attribution
- **FR-004**: Documentation MUST list all 30+ data sources with their update frequencies
- **FR-005**: CLAUDE.md MUST reflect current codebase structure and development practices

#### GitHub Actions & Publishing
- **FR-006**: CI/CD MUST run tests on every push to main branch and on pull requests
- **FR-007**: CI/CD MUST compile data using `pnpm compile` after successful tests
- **FR-008**: CI/CD MUST publish compiled orgs.json to GitHub Pages
- **FR-009**: CI/CD MUST update a timestamp showing when data was last generated
- **FR-010**: GitHub Actions MUST run nightly to regenerate the data
- **FR-011**: GitHub Actions MUST be manually triggerable on demand (workflow_dispatch)
- **FR-012**: Repository MUST be configured for publishing to chrisns/are-they-public-sector

#### Website & Data Explorer
- **FR-013**: Website MUST load and parse the static orgs.json file
- **FR-014**: Website MUST provide real-time search across organisation names only
- **FR-015**: Website MUST allow filtering by organisation type (e.g., NHS Trust, Local Authority)
- **FR-016**: Website MUST allow filtering by location (country/region)
- **FR-017**: Website MUST display organisation count and last updated date
- **FR-018**: Website MUST show individual organisation details including all metadata
- **FR-019**: Website MUST be responsive and work on mobile devices
- **FR-020**: Website MUST handle the large dataset efficiently using client-side JavaScript pagination
- **FR-021**: Search MUST be case-insensitive and support partial matches
- **FR-022**: Website MUST provide a download link to the raw orgs.json file

#### Data Display
- **FR-023**: Organisation list MUST show name, type, and status for each entry
- **FR-024**: Organisation details MUST show all available fields from the data model
- **FR-025**: Website MUST indicate data sources for transparency
- **FR-026**: Website MUST show data quality indicators and completeness scores on each organisation card
- **FR-027**: Website design MUST use clean minimalist design with a reputable CSS framework

### Key Entities

- **Organisation Data**: The compiled dataset containing ~60,000 UK public sector organisations with their metadata, sources, and relationships
- **Search Interface**: The user-facing search and filter functionality for exploring organisations
- **Documentation Set**: README, CLAUDE.md, and other documentation files that explain the project
- **CI/CD Pipeline**: Automated testing and deployment system that ensures data freshness

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

## Notes

### Clarifications Resolved:
1. **Website Performance**: Will use client-side JavaScript pagination for efficient data handling
2. **Data Quality Display**: Will show completeness scores and quality indicators on each card
3. **Visual Design**: Clean minimalist design using a reputable CSS framework (e.g., Tailwind, Bootstrap)
4. **Search Depth**: Search will be on organisation names only for simplicity
5. **Update Frequency**: GitHub Actions will run nightly, on push/PR, and on demand

### Assumptions:
- Website will be static (no backend) hosted on GitHub Pages
- All processing happens client-side in the browser
- Data updates are triggered by repository commits
- MIT license allows unrestricted use of the data