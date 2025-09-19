# UK Public Sector Organisation Data Sources

This document provides comprehensive details about all 30 data sources used by the UK Public Sector Organisation Aggregator.

## Overview

The aggregator pulls data from 30 diverse sources, combining government APIs, CSV downloads, Excel files, HTML scraping, and PDF parsing to create a unified dataset of 59,977 UK public sector organisations.

## Data Sources by Category

### 1. Core Government Sources

#### GOV.UK API
- **Source ID**: `govuk`, `gov-uk`
- **URL**: https://www.gov.uk/api/organisations
- **Format**: JSON API
- **Records**: ~300
- **Coverage**: Central government departments, agencies, NDPBs
- **Update Frequency**: Real-time
- **Implementation**: `src/cli/orchestrator.ts::fetchGovUkData()`

#### ONS Public Sector Classification Guide
- **Source ID**: `ons`
- **URL**: https://www.ons.gov.uk/economy/nationalaccounts/uksectoraccounts/datasets/publicsectorclassificationguide
- **Format**: Excel (dynamically resolved)
- **Records**: ~10,000
- **Coverage**: Institutional and non-institutional units
- **Update Frequency**: Quarterly
- **Implementation**: `src/cli/orchestrator.ts::fetchOnsData()`

### 2. Education Sector

#### GIAS (Get Information About Schools)
- **Source ID**: `gias`, `schools`
- **URL**: https://get-information-schools.service.gov.uk/Downloads
- **Format**: CSV download (edubasealldata)
- **Records**: ~30,000
- **Coverage**: All UK schools
- **Update Frequency**: Daily
- **Implementation**: `src/services/fetchers/gias-csv-fetcher.ts`

#### Northern Ireland Schools
- **Source ID**: `ni-schools`, `northern-ireland-schools`
- **URL**: https://www.opendatani.gov.uk/@education-authority/schools-data
- **Format**: JSON API
- **Records**: ~1,100
- **Coverage**: All NI schools
- **Update Frequency**: Termly
- **Implementation**: `src/cli/orchestrator.ts::fetchNISchoolsData()`

#### Further Education Colleges
- **Source ID**: `colleges`, `colleges-uk`
- **URL**: https://www.aoc.co.uk/colleges/college-mergers
- **Format**: PDF parsing
- **Records**: 43
- **Coverage**: FE colleges in Scotland, Wales, Northern Ireland
- **Update Frequency**: Annual
- **Implementation**: `src/cli/orchestrator.ts::fetchFurtherEducationColleges()`

### 3. Healthcare Sector

#### NHS Provider Directory
- **Source ID**: `nhs-provider-directory`, `nhs`
- **URL**: https://www.england.nhs.uk/publication/nhs-provider-directory/
- **Format**: HTML scraping
- **Records**: ~215
- **Coverage**: English NHS Trusts and Foundation Trusts
- **Update Frequency**: Monthly
- **Implementation**: `src/cli/orchestrator.ts::fetchNHSData()`

#### Integrated Care Boards (ICBs)
- **Source ID**: `icbs`, `integrated-care`
- **URL**: https://www.england.nhs.uk/integratedcare/integrated-care-in-your-area/
- **Format**: HTML scraping
- **Records**: 42
- **Coverage**: English health system ICBs
- **Update Frequency**: Quarterly
- **Implementation**: `src/services/fetchers/integrated-care-boards-fetcher.ts`

#### NHS Scotland Boards
- **Source ID**: `nhs-scotland`, `scottish-health`
- **URL**: https://www.scot.nhs.uk/organisations/
- **Format**: HTML scraping
- **Records**: 14
- **Coverage**: Scottish health boards
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/nhs-scotland-boards-fetcher.ts`

#### NI Health & Social Care Trusts
- **Source ID**: `ni-health`, `ni-trusts`
- **URL**: https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts
- **Format**: HTML scraping
- **Records**: 6
- **Coverage**: Northern Ireland health trusts
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/ni-health-trusts-fetcher.ts`

#### Local Healthwatch
- **Source ID**: `healthwatch`, `local-healthwatch`
- **URL**: https://www.healthwatch.co.uk/your-local-healthwatch/list
- **Format**: HTML scraping
- **Records**: 153
- **Coverage**: Patient advocacy organisations
- **Update Frequency**: Quarterly
- **Implementation**: `src/services/fetchers/local-healthwatch-fetcher.ts`

#### NHS Charities
- **Source ID**: `nhs-charities`, `nhs-charity`
- **URL**: https://nhscharitiestogether.co.uk/member-charities/
- **Format**: HTML scraping
- **Records**: ~240
- **Coverage**: NHS associated charitable organisations
- **Update Frequency**: Annual
- **Implementation**: `src/cli/orchestrator.ts::fetchNHSCharities()`

### 4. Local Government

#### DEFRA Local Authorities (UK-AIR)
- **Source ID**: `defra-uk-air`, `defra`, `la`
- **URL**: https://uk-air.defra.gov.uk/library/documents/list_of_la
- **Format**: HTML scraping
- **Records**: ~408
- **Coverage**: All UK local authorities
- **Update Frequency**: Annual
- **Implementation**: `src/cli/orchestrator.ts::fetchDefraLocalAuthorities()`

#### English Unitary Authorities
- **Source ID**: `english-unitary`, `ons-unitary`
- **URL**: ONS dataset via API
- **Format**: CSV download
- **Records**: 62
- **Coverage**: English unitary councils
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/english-unitary-authorities-fetcher.ts`

#### Districts of England
- **Source ID**: `districts`, `english-districts`
- **URL**: ONS dataset via API
- **Format**: CSV download
- **Records**: 164
- **Coverage**: English district councils
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/districts-of-england-fetcher.ts`

#### Welsh Unitary Authorities
- **Source ID**: `welsh-unitary`, `welsh-authorities`
- **URL**: ONS dataset via API
- **Format**: CSV download
- **Records**: 22
- **Coverage**: Welsh councils
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/welsh-unitary-authorities-fetcher.ts`

#### Welsh Community Councils
- **Source ID**: `welsh-councils`, `welsh-community`
- **URL**: https://en.wikipedia.org/wiki/List_of_communities_in_Wales
- **Format**: HTML scraping (Wikipedia tables)
- **Records**: ~1,100
- **Coverage**: All Welsh community councils
- **Update Frequency**: As updated
- **Implementation**: `src/services/fetchers/welsh-councils-fetcher.ts`

#### Scottish Community Councils
- **Source ID**: `scottish-councils`, `scottish-community`
- **URL**: https://en.wikipedia.org/wiki/List_of_community_councils_in_Scotland
- **Format**: HTML scraping (Wikipedia tables)
- **Records**: ~1,200
- **Coverage**: Active Scottish community councils
- **Update Frequency**: As updated
- **Implementation**: `src/services/fetchers/scottish-councils-fetcher.ts`

#### National Park Authorities
- **Source ID**: `national-parks`, `parks`
- **URL**: https://www.nationalparks.uk/
- **Format**: HTML scraping
- **Records**: 15
- **Coverage**: UK national park bodies
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/national-park-authorities-fetcher.ts`

### 5. Emergency Services

#### Police Forces
- **Source ID**: `police`, `police-uk`
- **URL**: https://www.police.uk/pu/contact-the-police/uk-police-forces/
- **Format**: HTML scraping
- **Records**: ~45
- **Coverage**: All UK territorial and special police forces
- **Update Frequency**: Annual
- **Implementation**: `src/cli/orchestrator.ts::fetchPoliceForces()`

#### Fire Services
- **Source ID**: `fire`, `nfcc`
- **URL**: https://www.nationalfirechiefs.org.uk/Fire-and-rescue-services
- **Format**: HTML scraping
- **Records**: ~50
- **Coverage**: All UK fire and rescue services
- **Update Frequency**: Annual
- **Implementation**: `src/cli/orchestrator.ts::fetchFireServices()`

### 6. Justice System

#### UK Courts
- **Source ID**: `courts`, `uk-courts`
- **URL**: https://www.gov.uk/courts-tribunals
- **Format**: HTML scraping
- **Records**: ~400
- **Coverage**: Courts and tribunals across the UK
- **Update Frequency**: Quarterly
- **Implementation**: `src/cli/orchestrator.ts::fetchCourts()`

### 7. Devolved Administrations

#### Devolved Administrations (Core)
- **Source ID**: `devolved`, `manual`
- **URL**: Static data
- **Format**: JSON (manual entry)
- **Records**: 27
- **Coverage**: Scottish Parliament, Welsh Senedd, NI Assembly and core departments
- **Update Frequency**: Annual
- **Implementation**: `src/cli/orchestrator.ts::fetchDevolvedAdministrations()`

#### Scottish Government Organisations
- **Source ID**: `scottish-gov`, `mygov-scot`
- **URL**: https://www.mygov.scot/organisations
- **Format**: HTML scraping
- **Records**: ~120
- **Coverage**: Scottish government bodies
- **Update Frequency**: Quarterly
- **Implementation**: `src/services/fetchers/scottish-government-orgs-fetcher.ts`

#### Additional Devolved Bodies
- **Source ID**: `devolved-extra`, `devolved-additional`
- **URL**: https://www.gov.uk/guidance/devolved-administrations-bills
- **Format**: HTML scraping
- **Records**: ~15
- **Coverage**: Welsh, Scottish, NI agencies not in core data
- **Update Frequency**: Annual
- **Implementation**: `src/cli/orchestrator.ts::fetchAdditionalDevolvedBodies()`

#### NI Government Departments
- **Source ID**: `ni-depts`, `ni-departments`
- **URL**: https://www.nidirect.gov.uk/contacts/government-departments-in-northern-ireland
- **Format**: HTML scraping
- **Records**: 9
- **Coverage**: Northern Ireland departments
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/ni-government-depts-fetcher.ts`

### 8. Transport

#### Scottish Regional Transport Partnerships
- **Source ID**: `scottish-rtps`, `rtps`
- **URL**: https://www.transport.gov.scot/our-approach/strategy/regional-transport-partnerships
- **Format**: HTML scraping
- **Records**: 7
- **Coverage**: Transport Scotland RTPs
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/scottish-rtps-fetcher.ts`

#### Northern Ireland Trust Ports
- **Source ID**: `ni-ports`, `trust-ports`
- **URL**: https://www.infrastructure-ni.gov.uk/articles/ports-and-harbours
- **Format**: HTML scraping
- **Records**: 5
- **Coverage**: NI port authorities
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/ni-trust-ports-fetcher.ts`

### 9. Research & Development

#### UK Research Councils
- **Source ID**: `research-councils`, `ukri`
- **URL**: https://www.ukri.org/councils/
- **Format**: HTML scraping
- **Records**: 9
- **Coverage**: UKRI research councils
- **Update Frequency**: Annual
- **Implementation**: `src/services/fetchers/uk-research-councils-fetcher.ts`

### 10. Other Public Bodies

#### Groundwork Trusts
- **Source ID**: `groundwork`, `groundwork-trusts`
- **URL**: https://www.groundwork.org.uk/trusts/
- **Format**: HTML scraping
- **Records**: 18
- **Coverage**: Environmental regeneration trusts
- **Update Frequency**: Annual
- **Implementation**: `src/cli/orchestrator.ts::fetchGroundworkTrusts()`

## Data Quality & Processing

### Quality Indicators
- **High Confidence (1.0)**: Direct government APIs and official CSV downloads
- **Medium Confidence (0.8)**: HTML scraping from official websites
- **Lower Confidence (0.6)**: Wikipedia and third-party sources

### Update Schedule
- **Daily**: GIAS schools data
- **Monthly**: NHS provider directory
- **Quarterly**: ONS classification, ICBs, Healthwatch
- **Annual**: Most other sources
- **As Updated**: Wikipedia sources

### Processing Features
- **Retry Logic**: Exponential backoff for failed requests
- **In-Memory Processing**: No temporary files created
- **Parallel Fetching**: Multiple sources fetched concurrently
- **Error Recovery**: Graceful handling of source failures
- **Data Validation**: Type checking and schema validation

## Implementation Details

### Fetcher Architecture
Each data source has a dedicated fetcher implementing the `BaseFetcher` interface:
- `fetch()`: Retrieves raw data from source
- `parse()`: Transforms raw data to internal format
- `map()`: Converts to standard Organisation model

### Common Patterns
- **HTML Scraping**: Uses cheerio for DOM parsing
- **CSV Parsing**: Uses csv-parse library
- **Excel Processing**: Uses xlsx library with buffer support
- **PDF Parsing**: Uses pdf-parse for document extraction

### Error Handling
- Network errors trigger retry with exponential backoff
- Parse errors are logged but don't stop aggregation
- Each source can fail independently without affecting others
- Failed sources return error status but aggregation continues

## Contributing New Sources

To add a new data source:

1. Create a new fetcher in `src/services/fetchers/`
2. Implement `BaseFetcher` interface
3. Add processing method to `orchestrator.ts`
4. Include source filter in `performCompleteAggregation()`
5. Add mapper if needed for custom transformation
6. Write contract, integration, and unit tests
7. Document in this file

## License & Usage

All aggregated data is available under MIT License. Individual source data may have specific licensing - check source websites for details.