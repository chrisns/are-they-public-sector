# Data Model: Groundwork Trusts and NHS Charities

**Feature**: 010-you-can-discover
**Date**: 2025-01-16

## Entity Definitions

### GroundworkTrustRaw
Raw data extracted from Groundwork website

```typescript
interface GroundworkTrustRaw {
  name: string;  // From dropdown option text
}
```

**Validation Rules**:
- name: Required, non-empty string
- name: Must not be "Select a region" or placeholder text

### NHSCharityRaw
Raw data from Storepoint API

```typescript
interface NHSCharityRaw {
  name: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;  // Used for filtering England/Wales
  website?: string;
  lat?: number;
  lng?: number;
  // Additional fields from API preserved as-is
  [key: string]: any;
}
```

**Validation Rules**:
- name: Required, non-empty string
- country: If present, filter for "England" or "Wales" only
- lat/lng: If present, must be valid coordinates

### Organisation (Target Model)
Maps to existing Organisation model

```typescript
interface Organisation {
  id: string;                    // Generated hash
  name: string;                   // From source
  type: OrganisationType;         // 'central_government'
  classification: string;         // Source-specific classification
  status: 'active' | 'inactive';  // Default 'active'
  location?: OrganisationLocation;
  website?: string;
  additionalProperties?: {
    source: string;              // 'groundwork' or 'nhs_charities'
    sponsor?: string;            // Department name
    [key: string]: any;
  };
  dataQuality?: DataQuality;
  lastUpdated: string;           // ISO timestamp
}

interface OrganisationLocation {
  address?: string;
  region?: string;
  postalCode?: string;
  country: string;              // "United Kingdom"
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
```

## Mapping Rules

### Groundwork Trust → Organisation
```typescript
{
  id: generateHash(name + 'groundwork'),
  name: raw.name,
  type: OrganisationType.CENTRAL_GOVERNMENT,
  classification: 'Groundwork Trust',
  status: 'active',
  location: {
    country: 'United Kingdom',
    region: extractRegionFromName(raw.name)  // e.g., "Yorkshire" from "Groundwork Yorkshire"
  },
  additionalProperties: {
    source: 'groundwork',
    sponsor: 'Department for Communities and Local Government',
    onsCode: 'S.1311'
  },
  dataQuality: calculateQuality(raw),
  lastUpdated: new Date().toISOString()
}
```

### NHS Charity → Organisation
```typescript
{
  id: generateHash(name + postcode + 'nhs'),
  name: raw.name,
  type: OrganisationType.CENTRAL_GOVERNMENT,
  classification: 'NHS Charity',
  status: 'active',
  location: {
    address: raw.address,
    region: raw.city,
    postalCode: raw.postcode,
    country: 'United Kingdom',
    coordinates: raw.lat && raw.lng ? {
      latitude: raw.lat,
      longitude: raw.lng
    } : undefined
  },
  website: raw.website,
  additionalProperties: {
    source: 'nhs_charities',
    sponsor: 'Department of Health',
    onsCode: 'S.1311',
    originalCountry: raw.country  // Preserve for reference
  },
  dataQuality: calculateQuality(raw),
  lastUpdated: new Date().toISOString()
}
```

## Data Quality Calculation

### Completeness Score
```typescript
function calculateQuality(raw: any): DataQuality {
  const fields = Object.keys(raw).filter(k => raw[k] !== null && raw[k] !== '');
  const totalPossibleFields = getExpectedFieldCount(raw);

  return {
    completeness: fields.length / totalPossibleFields,
    lastValidated: new Date().toISOString(),
    source: raw.source || 'live_fetch'
  };
}
```

### Field Weights
- **Required** (weight 1.0): name
- **Important** (weight 0.5): address, postcode, website
- **Nice-to-have** (weight 0.25): coordinates, city

## State Transitions
These entities are stateless - they represent a snapshot of data at fetch time.

## Relationships
- No direct relationships between entities
- Both types map to Organisation independently
- No deduplication between sources (as per requirements)

## Constraints
1. **Uniqueness**: ID generated from name + source to avoid collisions
2. **Region Filtering**: NHS Charities must be from England or Wales
3. **Name Required**: Minimum viable data is organisation name
4. **No Cross-Source Dedup**: Same org might appear in both sources

## Example Data

### Groundwork Trust Example
```json
{
  "name": "Groundwork Yorkshire"
}
```

Maps to:
```json
{
  "id": "a3f8c92d",
  "name": "Groundwork Yorkshire",
  "type": "central_government",
  "classification": "Groundwork Trust",
  "status": "active",
  "location": {
    "country": "United Kingdom",
    "region": "Yorkshire"
  },
  "additionalProperties": {
    "source": "groundwork",
    "sponsor": "Department for Communities and Local Government",
    "onsCode": "S.1311"
  },
  "dataQuality": {
    "completeness": 0.25,
    "lastValidated": "2025-01-16T12:00:00Z"
  },
  "lastUpdated": "2025-01-16T12:00:00Z"
}
```

### NHS Charity Example
```json
{
  "name": "Leeds Teaching Hospitals Charity",
  "address": "123 Hospital Road",
  "city": "Leeds",
  "postcode": "LS1 3EX",
  "country": "England",
  "website": "https://example.com",
  "lat": 53.8008,
  "lng": -1.5491
}
```

Maps to:
```json
{
  "id": "b7d4f831",
  "name": "Leeds Teaching Hospitals Charity",
  "type": "central_government",
  "classification": "NHS Charity",
  "status": "active",
  "location": {
    "address": "123 Hospital Road",
    "region": "Leeds",
    "postalCode": "LS1 3EX",
    "country": "United Kingdom",
    "coordinates": {
      "latitude": 53.8008,
      "longitude": -1.5491
    }
  },
  "website": "https://example.com",
  "additionalProperties": {
    "source": "nhs_charities",
    "sponsor": "Department of Health",
    "onsCode": "S.1311",
    "originalCountry": "England"
  },
  "dataQuality": {
    "completeness": 0.875,
    "lastValidated": "2025-01-16T12:00:00Z"
  },
  "lastUpdated": "2025-01-16T12:00:00Z"
}
```