# API Reference: Organisation Data Model

This document provides a comprehensive reference for the Organisation data model used by the UK Public Sector Organisation Aggregator.

## Table of Contents
- [Core Interfaces](#core-interfaces)
- [Enumerations](#enumerations)
- [Supporting Types](#supporting-types)
- [Validation Rules](#validation-rules)
- [Example Data](#example-data)

## Core Interfaces

### Organisation

The primary entity representing a UK public sector organisation after aggregation.

```typescript
interface Organisation {
  // Unique identifier (generated)
  id: string;                              // Example: "gias-100001", "nhs-RXF"

  // Core fields
  name: string;                            // Full official name
  alternativeNames?: string[];            // Trading names, abbreviations
  type: OrganisationType;                 // Enumerated type (see below)
  subType?: string;                       // More specific categorisation
  classification: string;                  // Human-readable classification

  // Hierarchical relationships
  parentOrganisation?: string;            // ID reference to parent org
  controllingUnit?: string;               // Sponsoring entity ID

  // Status and lifecycle
  status: 'active' | 'inactive' | 'dissolved';
  establishmentDate?: string;             // ISO date (YYYY-MM-DD)
  dissolutionDate?: string;               // ISO date (YYYY-MM-DD)

  // Location
  location?: OrganisationLocation;        // Address details
  region?: Region;                        // UK region classification

  // Source tracking
  sources: DataSourceReference[];         // Array of contributing sources

  // Metadata
  lastUpdated: string;                    // ISO datetime
  dataQuality: DataQuality;               // Quality metrics

  // Additional data
  additionalProperties?: Record<string, unknown>;  // Unmapped source fields
}
```

## Enumerations

### OrganisationType

Categorises organisations into specific types within the UK public sector.

```typescript
enum OrganisationType {
  // Central Government
  MINISTERIAL_DEPARTMENT = 'ministerial_department',
  EXECUTIVE_AGENCY = 'executive_agency',
  GOVERNMENT_DEPARTMENT = 'government_department',

  // Non-Departmental Public Bodies
  NDPB = 'non_departmental_public_body',
  EXECUTIVE_NDPB = 'executive_ndpb',
  ADVISORY_NDPB = 'advisory_ndpb',
  TRIBUNAL_NDPB = 'tribunal_ndpb',

  // Local Government
  LOCAL_AUTHORITY = 'local_authority',
  UNITARY_AUTHORITY = 'unitary_authority',
  DISTRICT_COUNCIL = 'district_council',
  WELSH_COMMUNITY_COUNCIL = 'welsh_community_council',
  SCOTTISH_COMMUNITY_COUNCIL = 'scottish_community_council',

  // Healthcare
  NHS_TRUST = 'nhs_trust',
  NHS_FOUNDATION_TRUST = 'nhs_foundation_trust',
  NI_HEALTH_TRUST = 'ni_health_trust',
  HEALTH_BOARD = 'health_board',
  INTEGRATED_CARE_BOARD = 'integrated_care_board',
  LOCAL_HEALTHWATCH = 'local_healthwatch',

  // Education
  EDUCATIONAL_INSTITUTION = 'educational_institution',
  ACADEMY_TRUST = 'academy_trust',

  // Emergency Services
  EMERGENCY_SERVICE = 'emergency_service',

  // Other
  PUBLIC_CORPORATION = 'public_corporation',
  DEVOLVED_ADMINISTRATION = 'devolved_administration',
  LEGISLATIVE_BODY = 'legislative_body',
  PUBLIC_BODY = 'public_body',
  JUDICIAL_BODY = 'judicial_body',
  REGIONAL_TRANSPORT_PARTNERSHIP = 'regional_transport_partnership',
  TRUST_PORT = 'trust_port',
  RESEARCH_COUNCIL = 'research_council',
  NATIONAL_PARK_AUTHORITY = 'national_park_authority',
  OTHER = 'other'
}
```

### Region

UK geographical regions for organisation classification.

```typescript
enum Region {
  ENGLAND = 'England',
  SCOTLAND = 'Scotland',
  WALES = 'Wales',
  NORTHERN_IRELAND = 'Northern Ireland',
  UK_WIDE = 'UK'
}
```

### DataSourceType

Identifies the original data source for an organisation record.

```typescript
enum DataSourceType {
  GOV_UK_API = 'gov_uk_api',
  ONS_INSTITUTIONAL = 'ons_institutional_unit',
  ONS_NON_INSTITUTIONAL = 'ons_non_institutional_unit',
  NHS_PROVIDER_DIRECTORY = 'nhs_provider_directory',
  DEFRA_UK_AIR = 'defra_uk_air',
  GIAS = 'gias',
  MANUAL = 'manual',
  POLICE_UK = 'police_uk',
  NFCC = 'nfcc',
  GOV_UK_GUIDANCE = 'gov_uk_guidance'
}
```

## Supporting Types

### DataSourceReference

Tracks which sources contributed to an organisation record.

```typescript
interface DataSourceReference {
  source: DataSourceType;         // Source identifier
  sourceId?: string;              // Original ID in source system
  retrievedAt: string;            // ISO datetime when fetched
  url?: string;                   // Source URL if applicable
  confidence: number;             // 0-1 confidence score
}
```

### DataQuality

Metadata about data completeness and reliability.

```typescript
interface DataQuality {
  completeness: number;           // 0-1 score (% of fields populated)
  hasConflicts: boolean;         // True if conflicting data exists
  conflictFields?: string[];     // Fields with conflicts
  requiresReview: boolean;       // Manual review needed
  reviewReasons?: string[];      // Why review is needed
}
```

### OrganisationLocation

Location information for an organisation.

```typescript
interface OrganisationLocation {
  address?: string;               // Full postal address
  region?: string;                // Sub-region or county
  country: string;                // Always "United Kingdom" or constituent
}
```

## Validation Rules

### Organisation Validation

```typescript
const organisationValidation = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 500
  },
  type: {
    required: true,
    enum: Object.values(OrganisationType)
  },
  status: {
    required: true,
    enum: ['active', 'inactive', 'dissolved']
  },
  sources: {
    required: true,
    minItems: 1
  }
};
```

### Quality Thresholds

```typescript
const qualityThresholds = {
  minCompleteness: 0.6,         // Minimum 60% fields populated
  reviewIfConflicts: true,      // Flag for review if conflicts exist
  duplicateThreshold: 0.9        // 90% similarity for duplicate detection
};
```

## Example Data

### Minimal Organisation

```json
{
  "id": "defra-E07000001",
  "name": "Adur District Council",
  "type": "district_council",
  "classification": "Local Authority",
  "status": "active",
  "sources": [{
    "source": "defra_uk_air",
    "retrievedAt": "2025-01-19T10:30:00Z",
    "confidence": 1.0
  }],
  "lastUpdated": "2025-01-19T10:30:00Z",
  "dataQuality": {
    "completeness": 0.6,
    "hasConflicts": false,
    "requiresReview": false
  }
}
```

### Complete Organisation

```json
{
  "id": "gias-100001",
  "name": "St Mary's Primary School",
  "alternativeNames": ["St Mary's CE Primary"],
  "type": "educational_institution",
  "subType": "Primary School",
  "classification": "Primary Education",
  "parentOrganisation": "academy-trust-001",
  "controllingUnit": "la-E09000001",
  "status": "active",
  "establishmentDate": "1965-09-01",
  "location": {
    "address": "123 School Lane, Westminster, London SW1A 1AA",
    "region": "Greater London",
    "country": "United Kingdom"
  },
  "region": "England",
  "sources": [{
    "source": "gias",
    "sourceId": "100001",
    "retrievedAt": "2025-01-19T10:30:00Z",
    "url": "https://get-information-schools.service.gov.uk/",
    "confidence": 1.0
  }],
  "lastUpdated": "2025-01-19T10:30:00Z",
  "dataQuality": {
    "completeness": 0.95,
    "hasConflicts": false,
    "requiresReview": false
  },
  "additionalProperties": {
    "urn": 100001,
    "ukprn": 10000001,
    "establishmentNumber": 3001,
    "phaseType": "Primary",
    "religiousCharacter": "Church of England",
    "ofstedRating": "Good",
    "ofstedLastInspection": "2023-03-15",
    "numberOfPupils": 420,
    "ageRange": "4-11",
    "gender": "Mixed",
    "telephone": "020 7123 4567",
    "website": "https://www.stmarysprimary.example.com",
    "headteacher": "Jane Smith"
  }
}
```

## Usage Examples

### TypeScript

```typescript
import { Organisation, OrganisationType } from './models/organisation';

// Create a new organisation
const org: Organisation = {
  id: 'custom-001',
  name: 'Example Organisation',
  type: OrganisationType.PUBLIC_BODY,
  classification: 'Public Body',
  status: 'active',
  sources: [{
    source: DataSourceType.MANUAL,
    retrievedAt: new Date().toISOString(),
    confidence: 1.0
  }],
  lastUpdated: new Date().toISOString(),
  dataQuality: {
    completeness: 0.7,
    hasConflicts: false,
    requiresReview: false
  }
};

// Filter organisations by type
const nhsTrusts = organisations.filter(
  org => org.type === OrganisationType.NHS_TRUST
);

// Check data quality
const needsReview = organisations.filter(
  org => org.dataQuality.requiresReview
);
```

### JavaScript (consuming the JSON)

```javascript
// Load the data
const data = require('./dist/orgs.json');

// Find schools
const schools = data.organisations.filter(
  org => org.type === 'educational_institution'
);

// Group by region
const byRegion = data.organisations.reduce((acc, org) => {
  const region = org.region || 'Unknown';
  if (!acc[region]) acc[region] = [];
  acc[region].push(org);
  return acc;
}, {});

// Search by name
const searchTerm = 'Birmingham';
const results = data.organisations.filter(
  org => org.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

## Field Mapping

When adding new data sources, map source fields to the Organisation model:

```typescript
interface FieldMapping {
  sourceField: string;                    // Field name in source
  targetField: keyof Organisation;        // Target Organisation field
  transformer?: (value: unknown) => unknown;  // Optional transformation
  required?: boolean;                     // Is field required?
}

// Example mapping
const mapping: FieldMapping = {
  sourceField: 'organisation_name',
  targetField: 'name',
  transformer: (value) => String(value).trim(),
  required: true
};
```

## Data Quality Scoring

The completeness score is calculated as:

```text
completeness = (populated_fields / total_fields) * weight_factor
```

Where:
- Core fields (name, type, status) have higher weights
- Optional fields contribute less to the score
- Minimum threshold is 0.6 for acceptable quality

## Notes

- All dates use ISO 8601 format (YYYY-MM-DD for dates, full ISO for timestamps)
- The `id` field combines source prefix and source ID (e.g., "gias-100001")
- The `additionalProperties` field preserves source-specific data not mapped to core fields
- Confidence scores range from 0-1, with 1.0 being highest confidence
- UTF-8 encoding is used throughout for proper Welsh/Scottish character support