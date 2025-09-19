# Mapper Service Contracts

## Base Mapper Contract

```typescript
interface Mapper<TInput, TOutput> {
  map(input: TInput, source: DataSource): TOutput;
  mapMany(inputs: TInput[], source: DataSource): TOutput[];
}
```

## 1. Unitary Authority Mapper

**Service**: `UnitaryAuthorityMapper`
**Input**: `UnitaryAuthorityData`
**Output**: `Organisation`

### Contract
```typescript
class UnitaryAuthorityMapper implements Mapper<UnitaryAuthorityData, Organisation> {
  map(input: UnitaryAuthorityData, source: DataSource): Organisation;
  mapMany(inputs: UnitaryAuthorityData[], source: DataSource): Organisation[];
}
```

### Mapping Rules
- `id`: Generate from normalised name + source
- `name`: Direct from input
- `type`: OrganisationType.UNITARY_AUTHORITY
- `region`: From input.region
- `source`: From parameter
- `metadata.code`: ONS code if available

### Example Transform
```json
// Input
{
  "name": "Birmingham City Council",
  "code": "E08000025",
  "region": "England"
}

// Output
{
  "id": "birmingham-city-council-ons",
  "name": "Birmingham City Council",
  "type": "unitary_authority",
  "region": "England",
  "source": "ons",
  "metadata": {
    "code": "E08000025"
  }
}
```

## 2. District Council Mapper

**Service**: `DistrictCouncilMapper`
**Input**: `DistrictCouncilData`
**Output**: `Organisation`

### Contract
```typescript
class DistrictCouncilMapper implements Mapper<DistrictCouncilData, Organisation> {
  map(input: DistrictCouncilData, source: DataSource): Organisation;
  mapMany(inputs: DistrictCouncilData[], source: DataSource): Organisation[];
}
```

### Mapping Rules
- `id`: Generate from normalised name + source
- `name`: Direct from input
- `type`: OrganisationType.DISTRICT_COUNCIL
- `subType`: From input.type (Borough/City/District)
- `region`: Region.ENGLAND
- `metadata.county`: From input.county

## 3. Health Organisation Mapper

**Service**: `HealthOrganisationMapper`
**Input**: `HealthOrganisationData`
**Output**: `Organisation`

### Contract
```typescript
class HealthOrganisationMapper implements Mapper<HealthOrganisationData, Organisation> {
  map(input: HealthOrganisationData, source: DataSource): Organisation;
  mapMany(inputs: HealthOrganisationData[], source: DataSource): Organisation[];
}
```

### Mapping Rules
- `type`: Based on input.type:
  - 'health_board' → OrganisationType.HEALTH_BOARD
  - 'integrated_care_board' → OrganisationType.INTEGRATED_CARE_BOARD
  - 'local_healthwatch' → OrganisationType.LOCAL_HEALTHWATCH
- `region`: Inferred from source or area

## 4. Transport Partnership Mapper

**Service**: `TransportPartnershipMapper`
**Input**: `TransportPartnershipData`
**Output**: `Organisation`

### Contract
```typescript
class TransportPartnershipMapper implements Mapper<TransportPartnershipData, Organisation> {
  map(input: TransportPartnershipData, source: DataSource): Organisation;
  mapMany(inputs: TransportPartnershipData[], source: DataSource): Organisation[];
}
```

### Mapping Rules
- `type`: OrganisationType.REGIONAL_TRANSPORT_PARTNERSHIP
- `region`: Region.SCOTLAND
- `metadata.abbreviation`: From input
- `metadata.memberCouncils`: From input.councils

## 5. Research Council Mapper

**Service**: `ResearchCouncilMapper`
**Input**: `ResearchCouncilData`
**Output**: `Organisation`

### Contract
```typescript
class ResearchCouncilMapper implements Mapper<ResearchCouncilData, Organisation> {
  map(input: ResearchCouncilData, source: DataSource): Organisation;
  mapMany(inputs: ResearchCouncilData[], source: DataSource): Organisation[];
}
```

### Mapping Rules
- `type`: OrganisationType.RESEARCH_COUNCIL
- `region`: Region.UK_WIDE
- `metadata.abbreviation`: From input
- `metadata.researchArea`: From input

## 6. Government Department Mapper

**Service**: `GovernmentDepartmentMapper`
**Input**: `GovernmentDepartmentData`
**Output**: `Organisation`

### Contract
```typescript
class GovernmentDepartmentMapper implements Mapper<GovernmentDepartmentData, Organisation> {
  map(input: GovernmentDepartmentData, source: DataSource): Organisation;
  mapMany(inputs: GovernmentDepartmentData[], source: DataSource): Organisation[];
}
```

### Mapping Rules
- `type`: OrganisationType.GOVERNMENT_DEPARTMENT
- `region`: Region.NORTHERN_IRELAND
- `metadata.minister`: From input
- `metadata.responsibilities`: From input

## 7. Generic Organisation Mapper

**Service**: `GenericOrganisationMapper`
**Input**: `Partial<Organisation>`
**Output**: `Organisation`

### Contract
```typescript
class GenericOrganisationMapper implements Mapper<Partial<Organisation>, Organisation> {
  map(input: Partial<Organisation>, source: DataSource): Organisation;
  mapMany(inputs: Partial<Organisation>[], source: DataSource): Organisation[];
}
```

### Usage
For sources that return near-complete Organisation objects (e.g., National Parks, Trust Ports)

## Common Mapping Functions

### ID Generation
```typescript
function generateId(name: string, source: DataSource): string {
  const normalised = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${normalised}-${source}`;
}
```

### Name Normalisation
```typescript
function normaliseName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/i, '');
}
```

### Region Detection
```typescript
function detectRegion(source: DataSource, area?: string): Region {
  const regionMap = {
    [DataSource.ONS]: Region.ENGLAND,
    [DataSource.NHS_SCOTLAND]: Region.SCOTLAND,
    [DataSource.LAW_GOV_WALES]: Region.WALES,
    [DataSource.INFRASTRUCTURE_NI]: Region.NORTHERN_IRELAND,
    [DataSource.UKRI]: Region.UK_WIDE,
  };
  return regionMap[source] || Region.ENGLAND;
}
```

## Validation Contract

All mappers must validate:

```typescript
interface ValidationRules {
  name: {
    required: true;
    maxLength: 255;
    pattern: /^[\w\s\-'.()&]+$/;
  };
  type: {
    required: true;
    enum: OrganisationType;
  };
  region: {
    required: true;
    enum: Region;
  };
}
```

## Error Handling

Mappers should throw specific errors:

```typescript
class MappingError extends Error {
  constructor(
    public field: string,
    public value: any,
    public reason: string
  ) {
    super(`Mapping failed for ${field}: ${reason}`);
  }
}
```