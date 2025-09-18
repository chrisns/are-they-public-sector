# Data Model: Welsh and Scottish Community Councils & NI Health Trusts

## Overview
Data model definitions for three new organisation types being added to the UK Public Sector Organisation Aggregator.

## Raw Data Models (Source-Specific)

### WelshCommunityRaw
```typescript
interface WelshCommunityRaw {
  name: string;                    // Required: Community council name
  principalArea: string;           // Required: Principal area/county
  population?: number;             // Optional: Population if available
  website?: string;               // Optional: Official website URL
  notes?: string;                 // Optional: Additional notes/status
}
```

**Validation Rules**:
- `name` must be non-empty string
- `principalArea` must be non-empty string
- `population` if present must be positive integer
- `website` if present must be valid URL format

### ScottishCommunityRaw
```typescript
interface ScottishCommunityRaw {
  name: string;                    // Required: Community council name
  councilArea: string;            // Required: Council area name
  region?: string;                // Optional: Sub-region within council area
  isActive: boolean;              // Required: Active/inactive status
  contactDetails?: string;        // Optional: Contact information
}
```

**Validation Rules**:
- `name` must be non-empty string
- `councilArea` must be non-empty string
- `isActive` must be boolean (derived from asterisk marker)
- Only include currently active councils (isActive = true) in final output

### NIHealthTrustRaw
```typescript
interface NIHealthTrustRaw {
  name: string;                    // Required: Trust name
  address?: string;               // Optional: Physical address
  phone?: string;                 // Optional: Contact phone
  website?: string;               // Optional: Official website
  email?: string;                 // Optional: Contact email
  servicesProvided?: string[];    // Optional: List of services
}
```

**Validation Rules**:
- `name` must be non-empty string
- `phone` if present must be valid UK phone format
- `website` if present must be valid URL format
- `email` if present must be valid email format

## Mapped Data Model (Unified Organisation)

### Organisation Interface Extension
All three types map to the existing Organisation interface:

```typescript
interface Organisation {
  id: string;                      // Generated: Type prefix + normalized name
  name: string;                    // From: raw.name
  type: OrganisationType;         // New types: see below
  subType?: string;               // Principal area / Council area / Trust type
  location?: string;              // Geographic location
  website?: string;               // Official website
  contactInfo?: ContactInfo;      // Phone, email, address
  metadata?: Record<string, any>; // Additional source-specific data
  sourceUrl: string;              // Data provenance URL
  lastUpdated: string;            // ISO date of last update
}
```

### New Organisation Types
```typescript
enum OrganisationType {
  // Existing types...
  WELSH_COMMUNITY_COUNCIL = 'Welsh Community Council',
  SCOTTISH_COMMUNITY_COUNCIL = 'Scottish Community Council',
  NI_HEALTH_TRUST = 'Health and Social Care Trust (NI)'
}
```

## Mapping Rules

### Welsh Community Council → Organisation
```typescript
{
  id: `WCC_${normalizeId(raw.name)}`,
  name: raw.name,
  type: OrganisationType.WELSH_COMMUNITY_COUNCIL,
  subType: raw.principalArea,
  location: `${raw.principalArea}, Wales`,
  website: raw.website,
  metadata: {
    population: raw.population,
    notes: raw.notes
  },
  sourceUrl: 'https://en.wikipedia.org/wiki/List_of_communities_in_Wales',
  lastUpdated: new Date().toISOString()
}
```

### Scottish Community Council → Organisation
```typescript
{
  id: `SCC_${normalizeId(raw.name)}`,
  name: raw.name,
  type: OrganisationType.SCOTTISH_COMMUNITY_COUNCIL,
  subType: raw.councilArea,
  location: `${raw.councilArea}, Scotland`,
  metadata: {
    region: raw.region,
    isActive: raw.isActive,
    contactDetails: raw.contactDetails
  },
  sourceUrl: 'https://en.wikipedia.org/wiki/List_of_community_council_areas_in_Scotland',
  lastUpdated: new Date().toISOString()
}
```

### NI Health Trust → Organisation
```typescript
{
  id: `NIHT_${normalizeId(raw.name)}`,
  name: raw.name,
  type: OrganisationType.NI_HEALTH_TRUST,
  subType: 'Health and Social Care',
  location: 'Northern Ireland',
  website: raw.website,
  contactInfo: {
    phone: raw.phone,
    email: raw.email,
    address: raw.address
  },
  metadata: {
    servicesProvided: raw.servicesProvided
  },
  sourceUrl: 'https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts',
  lastUpdated: new Date().toISOString()
}
```

## ID Generation Rules

### normalizeId Function
```typescript
function normalizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '')       // Trim underscores from ends
    .substring(0, 50);             // Limit length
}
```

### ID Prefixes
- `WCC_` - Welsh Community Council
- `SCC_` - Scottish Community Council
- `NIHT_` - NI Health Trust

## Deduplication Rules

### Primary Key
- Combination of `type` + `normalizeId(name)`

### Duplicate Detection
1. Exact name match within same type
2. Normalized name match within same type
3. Similar name (Levenshtein distance < 3) within same geographic area

### Merge Strategy
When duplicates detected:
1. Prefer entry with more complete data
2. Merge non-conflicting fields
3. Keep most recent `lastUpdated`
4. Log conflicts for manual review

## State Transitions

### Data Pipeline States
```
RAW_DATA → PARSED → VALIDATED → MAPPED → DEDUPLICATED → FINAL
```

### Error States
- `FETCH_FAILED`: Unable to retrieve source data
- `PARSE_FAILED`: Unable to extract data from HTML
- `VALIDATION_FAILED`: Data doesn't meet validation rules
- `MAPPING_FAILED`: Unable to map to Organisation model

## Data Quality Metrics

### Required Completeness
- Welsh Councils: 100% must have name and principalArea
- Scottish Councils: 100% must have name, councilArea, and isActive
- NI Health Trusts: 100% must have name

### Expected Counts
- Welsh Community Councils: 1,000-1,200 records
- Scottish Community Councils: 1,100-1,300 records
- NI Health Trusts: 5-6 records

### Quality Checks
1. No empty names
2. Valid geographic locations
3. Valid URLs if present
4. No duplicate IDs
5. Expected count ranges met

## Schema Version
**Version**: 1.0.0
**Last Updated**: 2025-09-17
**Breaking Changes**: None (additive only)