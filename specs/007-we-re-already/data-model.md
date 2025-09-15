# Data Model: UK Colleges

## Entities

### College
Represents a further education college in Scotland, Wales, or Northern Ireland.

**Fields**:
```typescript
interface College {
  // Core fields (from PDF)
  name: string;           // Required, college name from PDF

  // Derived fields
  region: CollegeRegion;  // Scotland, Wales, or Northern Ireland

  // Metadata
  source: string;         // PDF URL source
  fetchedAt: string;      // ISO timestamp of extraction
}
```

**Validation Rules**:
- `name`: Required, non-empty string, trimmed
- `region`: Must be one of defined enum values
- `source`: Valid URL format
- `fetchedAt`: Valid ISO 8601 timestamp

**Enums**:
```typescript
enum CollegeRegion {
  Scotland = 'Scotland',
  Wales = 'Wales',
  NorthernIreland = 'Northern Ireland'
}
```

### CollegesResult
Aggregate result from parsing all college PDFs.

**Fields**:
```typescript
interface CollegesResult {
  colleges: College[];
  metadata: {
    source: string;       // 'aoc.co.uk'
    fetchedAt: string;    // ISO timestamp
    counts: {
      scotland: number;
      wales: number;
      northernIreland: number;
      total: number;
    };
    validation: {
      scotlandMatch: boolean;
      walesMatch: boolean;
      northernIrelandMatch: boolean;
    };
  };
}
```

### Organisation (existing, mapping target)
The existing Organisation entity that College maps to.

**Mapping**:
```typescript
// College → Organisation
{
  id: generateId(college.name, 'college'),
  name: college.name,
  type: 'college',
  subType: 'further-education',
  metadata: {
    region: college.region,
    source: college.source,
    fetchedAt: college.fetchedAt,
    country: mapRegionToCountry(college.region)
  }
}
```

## Relationships
- College entities are independent (no relationships)
- Colleges map 1:1 to Organisation entities
- Deduplication handled at Organisation level (separate phase)

## State Transitions
None - colleges are static data entities with no state changes.

## Data Flow
```
AoC Webpage
    ↓
Extract PDF URLs + Counts
    ↓
Download PDFs (Scotland, Wales, NI)
    ↓
Parse PDF Tables → College[]
    ↓
Validate Counts
    ↓
Map to Organisation[]
    ↓
Aggregate with existing data
```

## Constraints
- All three regions must be successfully parsed or entire operation fails
- Counts from webpage must match parsed PDF counts
- No partial results - all or nothing approach
- PDFs only contain names, no additional metadata available