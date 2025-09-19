# Data Model: UK Government Organisation Data Sources

## Core Entity

### Organisation (existing, extended)
```typescript
interface Organisation {
  id: string;           // Unique identifier
  name: string;         // Organisation name
  type: OrganisationType;
  subType?: string;     // More specific categorisation
  region: Region;
  source: DataSource;
  url?: string;         // Official website if available
  parentId?: string;    // For hierarchical relationships
  status?: 'active' | 'inactive';
  metadata?: Record<string, any>;
}
```

## Enumerations

### OrganisationType (extended)
```typescript
enum OrganisationType {
  // Existing types...

  // Local Government
  UNITARY_AUTHORITY = 'unitary_authority',
  DISTRICT_COUNCIL = 'district_council',

  // Health
  HEALTH_BOARD = 'health_board',
  INTEGRATED_CARE_BOARD = 'integrated_care_board',
  LOCAL_HEALTHWATCH = 'local_healthwatch',

  // Transport
  REGIONAL_TRANSPORT_PARTNERSHIP = 'regional_transport_partnership',
  TRUST_PORT = 'trust_port',

  // Other Public Bodies
  RESEARCH_COUNCIL = 'research_council',
  NATIONAL_PARK_AUTHORITY = 'national_park_authority',
  GOVERNMENT_DEPARTMENT = 'government_department',
}
```

### Region (extended)
```typescript
enum Region {
  ENGLAND = 'England',
  SCOTLAND = 'Scotland',
  WALES = 'Wales',
  NORTHERN_IRELAND = 'Northern Ireland',
  UK_WIDE = 'UK',
}
```

### DataSource (new)
```typescript
enum DataSource {
  ONS = 'ons',
  WIKIPEDIA = 'wikipedia',
  NATIONAL_PARKS_ENGLAND = 'national_parks_england',
  NHS = 'nhs',
  HEALTHWATCH = 'healthwatch',
  MYGOV_SCOT = 'mygov_scot',
  NHS_SCOTLAND = 'nhs_scotland',
  TRANSPORT_SCOTLAND = 'transport_scotland',
  LAW_GOV_WALES = 'law_gov_wales',
  INFRASTRUCTURE_NI = 'infrastructure_ni',
  NI_GOVERNMENT = 'ni_government',
  UKRI = 'ukri',
}
```

## Source-Specific Models

### UnitaryAuthorityData
```typescript
interface UnitaryAuthorityData {
  name: string;
  code?: string;        // ONS code if available
  region: 'England' | 'Wales';
}
```

### DistrictCouncilData
```typescript
interface DistrictCouncilData {
  name: string;
  county?: string;      // Parent county
  type?: string;        // Borough, City, District
  population?: number;  // If available from Wikipedia
}
```

### HealthOrganisationData
```typescript
interface HealthOrganisationData {
  name: string;
  type: 'health_board' | 'integrated_care_board' | 'local_healthwatch';
  area?: string;        // Geographic coverage
  parentOrg?: string;   // For hierarchical health structures
}
```

### TransportPartnershipData
```typescript
interface TransportPartnershipData {
  name: string;
  abbreviation?: string;  // e.g., SPT, HITRANS
  councils?: string[];    // Member councils
}
```

### ResearchCouncilData
```typescript
interface ResearchCouncilData {
  name: string;
  abbreviation?: string;  // e.g., AHRC, BBSRC
  fullName?: string;
  researchArea?: string;
}
```

### GovernmentDepartmentData
```typescript
interface GovernmentDepartmentData {
  name: string;
  minister?: string;
  responsibilities?: string[];
}
```

## Fetcher Response Models

### FetcherResponse<T>
```typescript
interface FetcherResponse<T> {
  success: boolean;
  data?: T[];
  error?: string;
  source: DataSource;
  timestamp: Date;
  metadata?: {
    totalRecords?: number;
    pagesProcessed?: number;
    dynamicUrl?: string;    // For ONS CSV
  };
}
```

### PaginatedResponse<T>
```typescript
interface PaginatedResponse<T> extends FetcherResponse<T> {
  hasNextPage: boolean;
  currentPage: number;
  totalPages?: number;
}
```

## Mapper Input/Output

### MapperInput
```typescript
type MapperInput =
  | UnitaryAuthorityData
  | DistrictCouncilData
  | HealthOrganisationData
  | TransportPartnershipData
  | ResearchCouncilData
  | GovernmentDepartmentData;
```

### MapperOutput
```typescript
type MapperOutput = Organisation;
```

## Validation Rules

### Name Validation
- Required, non-empty
- Trim whitespace
- Handle Welsh/Scottish special characters
- Maximum length: 255 characters

### Region Validation
- Must be valid Region enum value
- Derived from source URL or explicit mapping

### Type Validation
- Must be valid OrganisationType enum value
- Consistent with source

### Deduplication Rules
- Normalise name (lowercase, remove punctuation)
- Compare normalised names
- If duplicate found:
  - Keep record with more complete data
  - Merge metadata fields
  - Log duplication for review

## State Transitions
Not applicable - organisations are static entities in this context

## Relationships

### Hierarchical Relationships
- District Councils → County (via parentId)
- Local Healthwatch → Regional structure
- Government departments → Parent department

### Geographic Relationships
- Organisations grouped by Region
- Transport partnerships span multiple council areas

## Data Quality Requirements
- All organisations must have name and type
- Region must be determinable from source
- Source attribution required for traceability
- UTF-8 encoding for international characters