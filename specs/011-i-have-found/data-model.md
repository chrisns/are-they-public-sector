# Data Model: GIAS CSV School Data

## Overview
The GIAS CSV download provides comprehensive school data in a flat CSV format with 150+ fields. This model defines the key entities and their relationships for the aggregator.

## Primary Entity: School

### Core Fields (Required)
```typescript
interface SchoolCore {
  URN: string;                    // Unique Reference Number (primary key)
  EstablishmentName: string;      // School name
  EstablishmentTypeGroup: string; // e.g., "Academies", "Local authority maintained schools"
  EstablishmentStatus: string;    // e.g., "Open", "Closed"
  TypeOfEstablishment: string;    // Detailed type
  PhaseOfEducation: string;       // e.g., "Primary", "Secondary"
  StatutoryLowAge: string;        // Minimum age
  StatutoryHighAge: string;       // Maximum age
}
```

### Location Fields
```typescript
interface SchoolLocation {
  Street?: string;
  Locality?: string;
  Address3?: string;
  Town?: string;
  County?: string;
  Postcode?: string;
  LocalAuthorityName: string;     // LA name
  LocalAuthorityCode: string;     // LA code
  Region?: string;                 // Geographic region
  ParliamentaryConstituency?: string;
  Easting?: string;               // OS grid reference
  Northing?: string;              // OS grid reference
  MSOA?: string;                  // Middle Super Output Area
  LSOA?: string;                  // Lower Super Output Area
}
```

### Administrative Fields
```typescript
interface SchoolAdmin {
  TelephoneNum?: string;
  HeadTitle?: string;             // e.g., "Mr", "Mrs"
  HeadFirstName?: string;
  HeadLastName?: string;
  HeadPreferredJobTitle?: string;
  SchoolWebsite?: string;
  TrustSchoolFlag?: string;       // Trust membership
  TrustName?: string;
  TrustCode?: string;
  FederationFlag?: string;
  FederationName?: string;
  FederationCode?: string;
  Ukprn?: string;                 // UK Provider Reference Number
  CompanyRegistrationNumber?: string;
}
```

### Statistical Fields
```typescript
interface SchoolStats {
  NumberOfPupils?: string;
  NumberOfBoys?: string;
  NumberOfGirls?: string;
  SchoolCapacity?: string;
  AdmissionsPolicy?: string;
  OfstedRating?: string;
  OfstedLastInsp?: string;
  InspectorateName?: string;
  LastChangedDate?: string;
  OpenDate?: string;
  CloseDate?: string;
}
```

### Complete School Entity
```typescript
interface GIASSchool extends SchoolCore, SchoolLocation, SchoolAdmin, SchoolStats {
  // All 150+ fields from CSV
  // Only key fields shown above for clarity
}
```

## Supporting Entities

### Download Session
```typescript
interface DownloadSession {
  cookies: Map<string, string>;
  csrfToken: string;
  downloadUuid?: string;
  startTime: Date;
  status: 'initializing' | 'downloading' | 'extracting' | 'complete' | 'failed';
}
```

### CSV Extract Result
```typescript
interface CSVExtractResult {
  rawCsv: string;              // Unprocessed CSV text
  lineCount: number;           // Total lines including header
  headers: string[];           // Column names
  extractedAt: Date;
  fileSize: number;            // Bytes
  compressionRatio: number;    // Compressed/uncompressed
}
```

## Transformation Mapping

### GIAS School → Organisation Model
```typescript
function mapGIASToOrganisation(school: GIASSchool): Organisation {
  return {
    id: generateId(school.URN),
    name: school.EstablishmentName,
    type: mapSchoolType(school.EstablishmentTypeGroup),
    classification: 'School',
    status: mapStatus(school.EstablishmentStatus),
    location: {
      address: formatAddress(school),
      postalCode: school.Postcode,
      region: school.Region,
      country: 'United Kingdom',
      coordinates: convertGridReference(school.Easting, school.Northing)
    },
    contact: {
      phone: school.TelephoneNum,
      website: school.SchoolWebsite
    },
    additionalProperties: {
      source: 'gias',
      urn: school.URN,
      localAuthority: school.LocalAuthorityName,
      trustName: school.TrustName,
      ofstedRating: school.OfstedRating,
      numberOfPupils: parseInt(school.NumberOfPupils || '0'),
      ageRange: `${school.StatutoryLowAge}-${school.StatutoryHighAge}`,
      establishmentType: school.TypeOfEstablishment
    },
    dataQuality: {
      completeness: calculateCompleteness(school),
      lastValidated: new Date().toISOString(),
      source: 'gias_csv'
    },
    lastUpdated: school.LastChangedDate || new Date().toISOString()
  };
}
```

## Validation Rules

### Required Field Validation
- URN must be present and numeric
- EstablishmentName must be non-empty
- EstablishmentStatus must be valid enum value

### Data Quality Checks
- Postcode format validation (UK postcode regex)
- Phone number format validation
- URL validation for website
- Date format validation (DD/MM/YYYY)
- Numeric field validation

### Business Rules
- Closed schools (EstablishmentStatus = 'Closed') included but marked
- Schools without postcodes flagged for review
- Trust schools linked via TrustCode
- Federation schools linked via FederationCode

## State Transitions

### Download Process States
```
initializing → downloading → extracting → complete
     ↓              ↓            ↓
   failed        failed       failed
```

### School Status States
- Proposed → Open → Closed
- Open → Merged (with URN reference)
- Open → Converted (to academy)

## Performance Considerations

### Memory Management
- Stream CSV parsing (don't load all in memory)
- Process in batches of 1000 schools
- Clear intermediate data after mapping

### Field Optimization
- Only parse required fields for initial load
- Lazy load additional fields on demand
- Index by URN for fast lookups

### Deduplication Strategy
- URN is unique identifier
- No duplicates expected in single CSV
- Cross-source dedup uses URN matching

## Error Handling

### Data Errors
- Missing required fields: Log and skip record
- Invalid format: Attempt correction, log if fails
- Encoding issues: UTF-8 with fallback to Latin-1

### Process Errors
- Download failure: Retry with exponential backoff
- Extraction failure: Log ZIP details, abort
- Parsing failure: Log line number, continue

## Notes
- CSV headers are first line, case-sensitive
- Empty fields are empty strings, not null
- Some fields contain internal delimiters (quoted)
- Date fields use UK format (DD/MM/YYYY)
- Numeric fields may contain commas (remove before parsing)