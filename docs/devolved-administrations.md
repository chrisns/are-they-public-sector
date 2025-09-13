# UK Devolved Administrations Data Sources Research

## Executive Summary

The UK has three devolved administrations (Scotland, Wales, Northern Ireland) each with their own government structure and departments. After extensive research, I've identified official data sources and structures for each administration.

## Devolved Administrations Overview

### 1. Scotland
- **Legislature**: Scottish Parliament
- **Executive**: Scottish Government
- **UK Department**: Scotland Office
- **Official Website**: gov.scot

### 2. Wales
- **Legislature**: Senedd (Welsh Parliament)
- **Executive**: Welsh Government
- **UK Department**: Wales Office
- **Official Website**: gov.wales

### 3. Northern Ireland
- **Legislature**: Northern Ireland Assembly
- **Executive**: Northern Ireland Executive
- **UK Department**: Northern Ireland Office
- **Official Website**: northernireland.gov.uk

## Data Sources Identified

### Scottish Government

#### Structure
- Led by Permanent Secretary
- 8 Directors General
- Multiple Directorates under each DG
- Divisions and Branches under Directorates

#### Data Access
- **Statistics Portal**: statistics.gov.scot
  - 275+ linked data datasets
  - API access available
  - R package: opendatascot
  - Formats: JSON, CSV, XML
- **Spatial Data**: SpatialData.gov.scot
- **Open Data**: data.gov.scot

#### Key Directorates (Partial List)
- Legal Services
- Marine Directorate
- Mental Health Directorate
- Local Government and Housing Directorate
- Primary Care Directorate
- Public Service Reform Directorate

### Welsh Government

#### Structure
- Led by Permanent Secretary (Andrew Goodall)
- Directors General for:
  - Health and Social Services/NHS Wales
  - Education and Public Services
  - Economy, Skills and Natural Resources
- Groups, Directorates, and Divisions

#### Data Access
- **StatsWales**: statswales.gov.wales
  - 1,000+ datasets
  - CSV downloads available
  - Note: OData API discontinued Aug 2024
- **DataMapWales**: datamap.gov.wales
  - Geographic data
  - WFS services with CSV/GeoJSON
- **Data.gov.uk**: Various Welsh datasets
  - CKAN API access
  - No API key required

### Northern Ireland Executive

#### Structure
- 9 Government Departments:
  1. The Executive Office
  2. Department of Agriculture, Environment & Rural Affairs
  3. Department for Communities
  4. Department of Education
  5. Department for the Economy
  6. Department of Finance
  7. Department for Infrastructure
  8. Department of Health
  9. Department of Justice

#### Data Access
- **NISRA Data Portal**: nisra.gov.uk
  - Formats: xlsx, csv, JSON-stat, px
  - API queries available
  - Interactive dashboards
- **NINIS**: Neighbourhood Statistics
- **Geographic Data**: Data Zones, Super Data Zones

## Implementation Recommendations

### Data Collection Strategy

1. **Static Data Approach** (Recommended)
   - Manually curate list of devolved administration departments
   - Store in JSON configuration file
   - Update quarterly or on structural changes
   - Rationale: Government structures change infrequently

2. **Dynamic API Approach** (Alternative)
   - Use statistics.gov.scot API for Scottish data
   - Scrape gov.wales organisation pages
   - Query NISRA portal for NI departments
   - Challenges: APIs inconsistent, some discontinued

### Data Model Proposal

```typescript
interface DevolvedAdministration {
  id: string;
  name: string;
  type: 'parliament' | 'government' | 'department' | 'agency';
  administration: 'scotland' | 'wales' | 'northern-ireland';
  parentId?: string;
  website?: string;
  established?: string;
  minister?: string;
  responsibilities?: string[];
}
```

### Aggregation Approach

1. **Phase 1**: Core Government Departments
   - Scottish Government Directorates
   - Welsh Government Groups
   - NI Executive Departments

2. **Phase 2**: Agencies and Public Bodies
   - Executive Agencies
   - Non-Departmental Public Bodies
   - NHS bodies (Scotland, Wales)

3. **Phase 3**: Local Authorities
   - 32 Scottish councils
   - 22 Welsh councils
   - 11 NI councils

## Data Quality Considerations

### Challenges
- No single authoritative API for all administrations
- Inconsistent data formats across nations
- Some APIs recently discontinued (StatsWales OData)
- Organisational structures vary significantly

### Mitigations
- Use multiple sources for validation
- Implement fail-fast on format changes
- Maintain manual override capability
- Regular verification against official websites

## Recommended Implementation

Given the research findings, I recommend:

1. **Static Configuration File**: Create a curated JSON file with all devolved administration departments
2. **Quarterly Updates**: Manual review and update process
3. **Validation**: Cross-reference with official websites
4. **Future Enhancement**: Add API integration when stable endpoints identified

## Conclusion

While comprehensive APIs exist for statistical data from devolved administrations, there's no single reliable API for organisational structure data. A hybrid approach using static configuration with periodic manual updates is most practical for this use case.

## References

- [Devolution Guidance - GOV.UK](https://www.gov.uk/guidance/devolution-of-powers-to-scotland-wales-and-northern-ireland)
- [Scottish Government Directorates](https://www.gov.scot/about/how-government-is-run/directorates/)
- [Welsh Government Organisation Chart](https://www.gov.wales/welsh-government-organisation-chart)
- [NI Executive Departments](https://www.northernireland.gov.uk/topics/government-departments)
- [Statistics.gov.scot API](https://statistics.gov.scot/home)
- [NISRA Data Portal](https://www.nisra.gov.uk/)