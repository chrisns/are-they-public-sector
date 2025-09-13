# Data Model: Schools

## School Entity

### Core Attributes
```typescript
interface School {
  // Unique identifier
  urn: number;                    // Unique Reference Number (mandatory)
  
  // Basic information
  name: string;                    // School name (mandatory)
  status: string;                  // "Open" or "Closed" (filter for Open only)
  
  // Classification
  phaseType: string;              // e.g., "Primary, Academy converter"
  localAuthority: string;         // Local authority name
  laestab: string;                // LA establishment code "XXX/XXXX"
  
  // Location
  address: string;                // Full postal address
  latitude?: number;              // GPS latitude (nullable)
  longitude?: number;             // GPS longitude (nullable)
}
```

### Validation Rules
1. **URN**: Must be a positive integer, unique across dataset
2. **Name**: Required, non-empty string
3. **Status**: Must equal "Open" (closed schools filtered out)
4. **Location**: Latitude/longitude may be null for some establishments

### State Transitions
N/A - Read-only data from external source

## Aggregation Response

### Structure
```typescript
interface SchoolsResponse {
  schools: School[];
  metadata: {
    source: string;              // "GIAS"
    fetchedAt: string;          // ISO 8601 timestamp
    totalCount: number;         // Total schools fetched
    openCount: number;          // Count after filtering
  };
}
```

## API Response Mapping

### GIAS JSON → School Entity
```typescript
{
  // Direct mappings
  "urn": number → urn
  "name": string → name
  "status": string → status
  "phaseType": string → phaseType
  "localAuthority": string → localAuthority
  "laestab": string → laestab
  "address": string → address
  
  // Nested mappings
  "location": {
    "latitude": number → latitude
    "longitude": number → longitude
  }
}
```

## Storage Format

### Output JSON Structure
```json
{
  "schools": [
    {
      "urn": 100000,
      "name": "St Mary's Primary School",
      "status": "Open",
      "phaseType": "Primary, Voluntary aided school",
      "localAuthority": "Westminster",
      "laestab": "213/3614",
      "address": "30 Bryanston Square, London, W1H 2EA",
      "latitude": 51.518872,
      "longitude": -0.159856
    }
  ],
  "metadata": {
    "source": "GIAS",
    "fetchedAt": "2025-09-13T10:00:00Z",
    "totalCount": 30245,
    "openCount": 29876
  }
}
```

## Integration with Existing Models

### Organisation Mapping
Schools will be transformed to the common Organisation interface:
```typescript
interface Organisation {
  name: string;           // School.name
  category: string;       // "Education"
  subcategory: string;    // School.phaseType
  identifier: string;     // School.urn.toString()
  source: string;         // "GIAS"
  metadata: {
    status: string;       // School.status
    localAuthority: string;
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}
```

## Deduplication Rules
- Primary key: URN
- If duplicate URN found, keep first occurrence
- Log warning for duplicates

## Data Quality Checks
1. Validate mandatory fields present
2. Check URN uniqueness
3. Verify status = "Open"
4. Validate coordinate ranges if present (-90 to 90 lat, -180 to 180 lng)
5. Log and continue on validation failures (don't fail entire aggregation)