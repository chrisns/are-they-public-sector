# Data Model: Northern Ireland Schools

## Overview
Data structures for Northern Ireland schools integration into the UK Public Sector Organisation Aggregator.

## Raw Data Model

### NISchoolRaw
Represents the raw data extracted from the Excel export.

```typescript
interface NISchoolRaw {
  // Core identification
  schoolName: string;
  referenceNumber?: string;

  // Classification
  schoolType: string;  // "Primary", "Post-Primary", "Special", "Nursery"
  managementType: string;  // "Controlled", "Voluntary", "Integrated", etc.

  // Location
  address1?: string;
  address2?: string;
  address3?: string;
  town?: string;
  postcode?: string;

  // Status
  status: string;  // "Open", "Closed", "Proposed"

  // Contact (if available)
  telephone?: string;
  email?: string;
  website?: string;

  // Additional metadata
  principalName?: string;
  enrolment?: number;
  ageRange?: string;
  ward?: string;
  constituency?: string;

  // Any additional fields from Excel
  [key: string]: any;
}
```

## Validation Rules

### Required Fields
- `schoolName`: Must be non-empty string
- `schoolType`: Must be one of recognized types
- `status`: Must equal "Open" (closed schools filtered out)

### Field Transformations
- Trim all string fields
- Normalize whitespace (multiple spaces to single)
- Convert empty strings to undefined
- Preserve numeric fields as numbers

## Mapped Data Model

### Organisation (Target Model)
Maps to the existing Organisation interface used throughout the aggregator.

```typescript
interface Organisation {
  name: string;
  category: "Northern Ireland School";
  subcategory: SchoolSubcategory;
  identifier?: string;
  location?: {
    address?: string;
    postcode?: string;
    town?: string;
  };
  contact?: {
    telephone?: string;
    email?: string;
    website?: string;
  };
  metadata?: {
    managementType?: string;
    principal?: string;
    enrolment?: number;
    ageRange?: string;
    ward?: string;
    constituency?: string;
    sourceSystem: "NI Education Department";
    lastUpdated: string;
  };
}

type SchoolSubcategory =
  | "Primary School"
  | "Post-Primary School"
  | "Special School"
  | "Nursery School"
  | "Other School";
```

## Mapping Rules

### Category Assignment
- All records → `category: "Northern Ireland School"`

### Subcategory Mapping
```
"Primary" → "Primary School"
"Post-Primary" → "Post-Primary School"
"Special" → "Special School"
"Nursery" → "Nursery School"
Others → "Other School"
```

### Location Assembly
- Concatenate available address fields
- Preserve postcode separately
- Town as separate field

### Contact Assembly
- Include all available contact methods
- Validate email format if present
- Validate URL format if present

### Metadata Preservation
- Keep all additional fields in metadata
- Add source system identifier
- Add processing timestamp

## State Transitions

### Processing States
```
1. RAW_FETCHED: Excel data downloaded
2. PARSED: Excel converted to NISchoolRaw[]
3. VALIDATED: Required fields verified, count checked
4. FILTERED: Only "Open" schools retained
5. MAPPED: Converted to Organisation[]
6. INTEGRATED: Merged with main dataset
```

### Error States
```
- FETCH_ERROR: Unable to retrieve data
- PARSE_ERROR: Excel format invalid
- VALIDATION_ERROR: Missing required fields
- COUNT_ERROR: Count outside ±10% tolerance
```

## Relationships

### To Other Entities
- May have duplicates with existing schools from other sources
- Deduplication based on name + postcode matching
- Preserve both records with cross-reference in metadata

## Aggregation Rules

### Count Validation
- Expected: 1122 schools (±10%)
- Min threshold: 1010 schools
- Max threshold: 1234 schools
- Action on violation: Fail with clear error

### Deduplication Strategy
1. Exact match: name + postcode
2. Fuzzy match: name similarity >90% + same town
3. On match: Merge metadata, prefer NI source for NI-specific fields

## Performance Considerations

### Memory Management
- Process in batches of 100 records
- Clear intermediate objects after mapping
- Stream processing for files >10MB

### Validation Performance
- Fail fast on first critical error
- Batch validate before processing
- Cache compiled validation schemas

## Change Management

### Version Compatibility
- Detect Excel format version if available
- Map columns by header name, not position
- Log unknown columns for investigation

### Schema Evolution
- New fields → add to metadata
- Removed fields → mark as deprecated
- Changed fields → migration mapping

## Quality Metrics

### Data Quality Indicators
- Completeness: % of optional fields populated
- Validity: % of records passing all validations
- Uniqueness: % of deduplicated records
- Consistency: % matching expected patterns

### Monitoring Points
- Total records processed
- Records filtered (not "Open")
- Records deduplicated
- Validation failures by type
- Processing time per phase