# Data Model: UK Public Sector Organizations

**Date**: 2025-09-12  
**Feature**: 002-the-current-implementation

## Core Entities

### Organization
The unified organization entity that combines data from all sources.

**Fields**:
- `id`: string - Unique identifier (generated or from source)
- `name`: string - Organization name
- `type`: OrganisationType - Type classification
- `status`: OrganisationStatus - Current status (active/inactive/withdrawn)
- `sources`: DataSource[] - Array of source records
- `classification`: string? - ONS classification
- `parentOrganisation`: string? - Parent organization name
- `website`: string? - Official website URL
- `startDate`: string? - Establishment date (ISO format)
- `endDate`: string? - Dissolution date (ISO format)
- `lastUpdated`: string - Last update timestamp (ISO format)

### DataSource
Tracks the origin of each organization record.

**Fields**:
- `source`: DataSourceType - Source identifier
- `sourceId`: string? - ID in source system
- `retrievedAt`: string - Fetch timestamp
- `originalData`: object - Preserved source fields

## Source-Specific Models

### GovUKOrganisation
Organizations from GOV.UK API (expected: 611 records).

**Required Fields**:
- `title`: string - Organization name
- `format`: string - Should be "Organisation"
- `details`: object - Contains detailed information

**Optional Fields**:
- `slug`: string? - URL slug
- `web_url`: string? - GOV.UK page URL
- `withdrawn`: boolean? - Withdrawal status
- `updated_at`: string? - Last update time

### ONSInstitutionalUnit
Organizations from ONS Excel "Organisation|Institutional Unit" tab (expected: 3360 records).

**Required Fields**:
- `Organisation name`: string - Full organization name
- `ONS code`: string - Unique ONS identifier

**Optional Fields**:
- `Classification`: string? - Public sector classification
- `Parent organisation`: string? - Parent entity name
- `Start date`: string? - Establishment date
- `End date`: string? - Dissolution date

### ONSNonInstitutionalUnit
Organizations from ONS Excel "Non-Institutional Units" tab (expected: 57 records).

**Required Fields**:
- `Non-Institutional Unit name`: string - Unit name

**Optional Fields**:
- `Sponsoring Entity`: string? - Sponsoring organization
- `Classification`: string? - Unit classification
- `Status`: string? - Current status

## Enumerations

### DataSourceType
```typescript
enum DataSourceType {
  GOV_UK_API = "gov_uk_api",
  ONS_INSTITUTIONAL = "ons_institutional",
  ONS_NON_INSTITUTIONAL = "ons_non_institutional"
}
```

### OrganisationType
```typescript
enum OrganisationType {
  MINISTERIAL_DEPARTMENT = "ministerial_department",
  NON_MINISTERIAL_DEPARTMENT = "non_ministerial_department",
  EXECUTIVE_AGENCY = "executive_agency",
  EXECUTIVE_NDPB = "executive_ndpb",
  ADVISORY_NDPB = "advisory_ndpb",
  TRIBUNAL_NDPB = "tribunal_ndpb",
  PUBLIC_CORPORATION = "public_corporation",
  OTHER = "other"
}
```

### OrganisationStatus
```typescript
enum OrganisationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  WITHDRAWN = "withdrawn",
  MERGED = "merged",
  REPLACED = "replaced"
}
```

## Validation Rules

### Organization
1. `name` must be non-empty string
2. `type` must be valid OrganisationType value
3. `status` must be valid OrganisationStatus value
4. `sources` must contain at least one DataSource
5. `lastUpdated` must be valid ISO 8601 timestamp

### GovUKOrganisation
1. `title` must be non-empty string
2. `format` should equal "Organisation"
3. If `withdrawn` is true, status should be WITHDRAWN

### ONSInstitutionalUnit
1. `Organisation name` must be non-empty string
2. `ONS code` must be non-empty string
3. Dates must be parseable if provided

### ONSNonInstitutionalUnit
1. `Non-Institutional Unit name` must be non-empty string
2. If `Status` provided, should map to OrganisationStatus

## Deduplication Rules

### Matching Strategy
Organizations are considered duplicates if any of:
1. Same `ONS code` (exact match)
2. Same `name` after normalization (case-insensitive, punctuation removed)
3. Same GOV.UK `slug` value

### Conflict Resolution
When duplicates are found:
1. Prefer record with most complete data
2. Preserve all source references
3. Use most recent `lastUpdated` timestamp
4. Flag conflicts for manual review if data differs

## Field Mapping

### GOV.UK → Organization
- `title` → `name`
- `format` → validate as "Organisation"
- `details.type` → `type` (with mapping)
- `withdrawn` → `status` (WITHDRAWN if true, else ACTIVE)
- `web_url` → `website`
- `updated_at` → `lastUpdated`

### ONS Institutional → Organization
- `Organisation name` → `name`
- `ONS code` → `id` (prefixed with "ONS:")
- `Classification` → `classification`
- `Parent organisation` → `parentOrganisation`
- `Start date` → `startDate`
- `End date` → `endDate`

### ONS Non-Institutional → Organization
- `Non-Institutional Unit name` → `name`
- `Sponsoring Entity` → `parentOrganisation`
- `Classification` → `classification`
- `Status` → `status` (with mapping)

## Statistics Tracking

### ProcessingStatistics
**Fields**:
- `totalOrganisations`: number - Final count after deduplication
- `duplicatesFound`: number - Number of duplicates detected
- `conflictsDetected`: number - Data conflicts requiring review
- `organisationsByType`: Record<OrganisationType, number> - Count by type
- `organisationsBySource`: Record<DataSourceType, number> - Count by source

### Expected Counts
- GOV.UK API: 611 organizations
- ONS Institutional Units: 3360 organizations
- ONS Non-Institutional Units: 57 organizations
- **Total (before deduplication)**: 4028 organizations
- **Total (after deduplication)**: ~4000 organizations (estimated)