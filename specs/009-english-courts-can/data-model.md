# Data Model: UK Courts and Tribunals

## Core Entities

### Court
Primary entity representing a court or tribunal in the UK.

```typescript
interface Court {
  // Identification
  name: string;                    // Required: Full official name
  slug?: string;                   // URL-friendly identifier
  identifier?: string;             // Source-specific ID (number, cci_code, etc.)

  // Classification
  type: CourtType[];              // Array of court types
  jurisdiction: Jurisdiction;      // England & Wales, NI, Scotland
  status: CourtStatus;            // active, inactive, unknown

  // Location
  location?: CourtLocation;       // Physical address and coordinates

  // Contact
  contact?: CourtContact;         // Communication details

  // Services
  areasOfLaw?: string[];         // Legal areas handled
  services?: string[];           // Additional services offered

  // Metadata
  sourceSystem: string;          // CSV, NI Website, Scottish Courts
  lastUpdated: string;           // ISO date of last update
}
```

### CourtType
Enumeration of court types found across UK jurisdictions.

```typescript
enum CourtType {
  // England & Wales
  CROWN_COURT = "Crown Court",
  MAGISTRATES_COURT = "Magistrates' Court",
  COUNTY_COURT = "County Court",
  HIGH_COURT = "High Court",
  COURT_OF_APPEAL = "Court of Appeal",
  FAMILY_COURT = "Family Court",
  TRIBUNAL = "Tribunal",

  // Northern Ireland specific
  CORONERS_COURT = "Coroner's Court",
  ENFORCEMENT_OF_JUDGMENTS = "Enforcement of Judgments Office",

  // Scotland specific
  SHERIFF_COURT = "Sheriff Court",
  JUSTICE_OF_PEACE_COURT = "Justice of the Peace Court",
  COURT_OF_SESSION = "Court of Session",
  HIGH_COURT_OF_JUSTICIARY = "High Court of Justiciary",

  // Generic
  OTHER = "Other"
}
```

### Jurisdiction
```typescript
enum Jurisdiction {
  ENGLAND_WALES = "England & Wales",
  NORTHERN_IRELAND = "Northern Ireland",
  SCOTLAND = "Scotland"
}
```

### CourtStatus
```typescript
enum CourtStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  UNKNOWN = "unknown"
}
```

### CourtLocation
Location information for the court.

```typescript
interface CourtLocation {
  // Address components
  addressLines?: string[];        // Street address lines
  town?: string;                  // Town or city
  county?: string;                // County or region
  postcode?: string;              // UK postcode
  country: string;                // Always "United Kingdom"

  // Coordinates
  latitude?: number;              // Decimal latitude
  longitude?: number;             // Decimal longitude

  // Full formatted address
  fullAddress?: string;           // Complete address as string
}
```

### CourtContact
Contact information for the court.

```typescript
interface CourtContact {
  telephone?: string;             // Main phone number
  fax?: string;                   // Fax number if available
  email?: string;                 // General enquiries email
  website?: string;               // Court-specific website
  dxNumber?: string;              // Document Exchange number
  textphone?: string;             // Accessibility phone
}
```

## Raw Data Interfaces

### EnglishCourtRaw
Raw data from CSV file.

```typescript
interface EnglishCourtRaw {
  name: string;
  lat?: string;
  lon?: string;
  number?: string;
  cci_code?: string;
  magistrate_code?: string;
  slug?: string;
  types?: string;                // JSON array as string
  open?: string;                  // "true" or "false"
  dx_number?: string;
  areas_of_law?: string;          // JSON array as string
  addresses?: string;             // JSON object as string
}
```

### NICourtRaw
Raw data from NI website.

```typescript
interface NICourtRaw {
  name: string;
  nodeId?: string;                // From href="/node/123"
  address?: string;
  telephone?: string;
  email?: string;
  // Additional fields from detail page if fetched
}
```

### ScottishCourtRaw
Raw data from Scottish courts (if accessible).

```typescript
interface ScottishCourtRaw {
  name: string;
  type?: string;
  address?: string;
  telephone?: string;
  // Structure TBD based on actual data source
}
```

## Validation Rules

### Required Fields
- `name`: Must be non-empty string
- `jurisdiction`: Must be valid enum value
- `status`: Defaults to "unknown" if not provided
- `sourceSystem`: Must identify data source

### Data Transformations
1. **CSV types field**: Parse JSON array string to CourtType[]
2. **CSV open field**: Convert "true"/"false" to CourtStatus
3. **CSV addresses**: Parse JSON object to CourtLocation
4. **CSV areas_of_law**: Parse JSON array to string[]
5. **Coordinates**: Convert string lat/lon to numbers

### Business Rules
1. Courts without names are rejected
2. Inactive courts included but marked appropriately (FR-019)
3. Missing optional data does not cause failure (FR-018)
4. No deduplication between sources (FR-020)
5. All available data extracted (FR-017)

## State Transitions
Courts do not have state transitions in this system - they are read-only entities fetched from external sources.

## Relationships
- Courts are independent entities
- No parent-child relationships
- No cross-references between jurisdictions
- Maps to Organisation model in aggregation layer