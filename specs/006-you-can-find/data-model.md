# Data Model: Emergency Services and Devolved Administration Entities

## Core Entities

### EmergencyService (Base Interface)
```typescript
interface EmergencyService {
  name: string;                    // Service name
  serviceType: 'police' | 'fire';  // Type of emergency service
  website?: string;                // Official website URL
  region?: string;                 // Geographic coverage area
  headquarters?: string;           // HQ location if available
}
```

### PoliceForce
```typescript
interface PoliceForce extends EmergencyService {
  serviceType: 'police';
  forceType: 'territorial' | 'special' | 'crown_dependency' | 'overseas_territory';
  jurisdiction: string;            // Area of operation
  chiefConstable?: string;         // Current leadership
  policeAndCrimeCommissioner?: string; // PCC if applicable
}
```

### FireService
```typescript
interface FireService extends EmergencyService {
  serviceType: 'fire';
  authorityType: 'county' | 'metropolitan' | 'combined_authority' | 'unitary';
  stationCount?: number;           // Number of fire stations
  coverage: string[];              // List of areas covered
}
```

### DevolvedBody
```typescript
interface DevolvedBody {
  name: string;                    // Organisation name
  nation: 'scotland' | 'wales' | 'northern_ireland';
  bodyType: 'parliament' | 'assembly' | 'government' | 'department' | 'agency' | 'public_body';
  parentBody?: string;             // Parent organisation if applicable
  established?: string;            // ISO date
  responsibilities?: string[];     // Key areas of responsibility
  website?: string;
}
```

## Organisation Type Extensions

Add to existing `OrganisationType` enum:
```typescript
export enum OrganisationType {
  // ... existing types ...
  EMERGENCY_SERVICE = 'emergency_service',
  // DEVOLVED_ADMINISTRATION already exists
}
```

## Mapping to Organisation Model

### Police Force → Organisation
```typescript
{
  id: `police-${generateId(force.name)}`,
  name: force.name,
  type: OrganisationType.EMERGENCY_SERVICE,
  classification: `Police Force - ${force.forceType}`,
  status: 'active',
  location: {
    country: 'United Kingdom',
    region: force.jurisdiction
  },
  sources: [{
    source: DataSourceType.POLICE_UK,
    sourceId: force.name,
    retrievedAt: new Date().toISOString(),
    url: 'https://www.police.uk/pu/contact-us/uk-police-forces/',
    confidence: 1.0
  }],
  dataQuality: {
    completeness: calculateCompleteness(force),
    hasConflicts: false,
    requiresReview: false
  },
  lastUpdated: new Date().toISOString(),
  additionalProperties: {
    serviceType: 'police',
    forceType: force.forceType,
    jurisdiction: force.jurisdiction,
    website: force.website,
    chiefConstable: force.chiefConstable,
    pcc: force.policeAndCrimeCommissioner
  }
}
```

### Fire Service → Organisation
```typescript
{
  id: `fire-${generateId(service.name)}`,
  name: service.name,
  type: OrganisationType.EMERGENCY_SERVICE,
  classification: `Fire and Rescue Service - ${service.authorityType}`,
  status: 'active',
  location: {
    country: 'United Kingdom',
    region: service.region
  },
  sources: [{
    source: DataSourceType.NFCC,
    sourceId: service.name,
    retrievedAt: new Date().toISOString(),
    url: 'https://nfcc.org.uk/contacts/fire-and-rescue-services/',
    confidence: 1.0
  }],
  dataQuality: {
    completeness: calculateCompleteness(service),
    hasConflicts: false,
    requiresReview: false
  },
  lastUpdated: new Date().toISOString(),
  additionalProperties: {
    serviceType: 'fire',
    authorityType: service.authorityType,
    coverage: service.coverage,
    stationCount: service.stationCount,
    website: service.website
  }
}
```

### Devolved Body → Organisation
```typescript
{
  id: `devolved-${generateId(body.name)}`,
  name: body.name,
  type: OrganisationType.DEVOLVED_ADMINISTRATION,
  classification: `${body.nation} ${body.bodyType}`,
  status: 'active',
  parentOrganisation: body.parentBody,
  location: {
    country: 'United Kingdom',
    region: body.nation
  },
  sources: [{
    source: DataSourceType.GOV_UK_GUIDANCE,
    sourceId: body.name,
    retrievedAt: new Date().toISOString(),
    url: 'https://www.gov.uk/guidance/devolution-of-powers-to-scotland-wales-and-northern-ireland',
    confidence: 0.9
  }],
  dataQuality: {
    completeness: calculateCompleteness(body),
    hasConflicts: false,
    requiresReview: false
  },
  lastUpdated: new Date().toISOString(),
  additionalProperties: {
    nation: body.nation,
    bodyType: body.bodyType,
    established: body.established,
    responsibilities: body.responsibilities,
    website: body.website
  }
}
```

## Data Source Type Extensions

Add to existing `DataSourceType` enum:
```typescript
export enum DataSourceType {
  // ... existing types ...
  POLICE_UK = 'police_uk',
  NFCC = 'nfcc',
  GOV_UK_GUIDANCE = 'gov_uk_guidance'
}
```

## Validation Rules

### Police Force Validation
- `name`: Required, non-empty, max 200 chars
- `forceType`: Required, must be valid enum value
- `jurisdiction`: Required for territorial forces
- `website`: Optional, must be valid URL if present

### Fire Service Validation
- `name`: Required, non-empty, max 200 chars
- `authorityType`: Required, must be valid enum value
- `region`: Required, non-empty
- `coverage`: Optional array, each item non-empty string

### Devolved Body Validation
- `name`: Required, non-empty, max 200 chars
- `nation`: Required, must be valid enum value
- `bodyType`: Required, must be valid enum value
- `parentBody`: Optional, must match existing organisation if present

## Deduplication Strategy

### Matching Rules
1. **Police Forces**: Exact name match OR normalized name match (remove "Police", "Constabulary")
2. **Fire Services**: Exact name match OR normalized name match (remove "Fire and Rescue", "Fire Service", "Fire Authority")
3. **Devolved Bodies**: Exact name match against existing devolved-administrations.json

### Conflict Resolution
When duplicates found:
1. Prefer record with higher completeness score
2. Merge additional properties (union of fields)
3. Keep all source references
4. Flag for review if significant differences

## Completeness Scoring

### Base Score Calculation
```typescript
function calculateCompleteness(entity: any): number {
  const fields = Object.keys(entity);
  const nonNullFields = fields.filter(key => 
    entity[key] !== null && 
    entity[key] !== undefined && 
    entity[key] !== ''
  );
  return nonNullFields.length / fields.length;
}
```

### Weighted Scoring
- Required fields: 0.6 weight
- Optional fields: 0.4 weight
- Minimum threshold: 0.5 for acceptance

## State Transitions

Emergency services are generally stable entities:
- `active`: Currently operational
- `inactive`: Temporarily non-operational
- `dissolved`: Merged or disbanded (historical)

Transitions occur through:
- Mergers (multiple forces/services combine)
- Reorganisation (boundaries change)
- Devolution (new bodies created)

---
*Data model complete - ready for contract generation*