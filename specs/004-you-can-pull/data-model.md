# Data Model: NHS Trusts and Local Authorities

## New Entity Models

### NHSTrust
```typescript
interface NHSTrust {
  name: string;           // Full trust name from HTML
  code: string;           // Generated from slugified name
  type: 'trust' | 'foundation-trust';  // Based on "Foundation" in name
  url?: string;           // If individual trust page URL available
}
```

**Validation Rules**:
- name: Required, non-empty string
- code: Auto-generated, lowercase, hyphenated
- type: Determined by presence of "Foundation" in name
- url: Optional, valid URL format if present

### LocalAuthority
```typescript
interface LocalAuthority {
  name: string;           // Authority name from HTML
  code: string;           // Generated from name + domain
  type: 'county' | 'district' | 'borough' | 'city' | 'unitary';
  url: string;            // Authority website URL
}
```

**Validation Rules**:
- name: Required, non-empty string
- code: Auto-generated from name and URL domain
- type: Inferred from name patterns (Council type)
- url: Required, valid HTTP/HTTPS URL

## Mapping to Existing Organisation Model

### Current Organisation Interface
```typescript
interface Organisation {
  name: string;
  domain?: string;
  category?: string;
  subcategory?: string;
  source: string;
  identifier?: string;
}
```

### Mapping Rules

**NHSTrust → Organisation**:
```typescript
{
  name: trust.name,
  domain: trust.url ? new URL(trust.url).hostname : undefined,
  category: 'health',
  subcategory: trust.type === 'foundation-trust' ? 'nhs-foundation-trust' : 'nhs-trust',
  source: 'nhs-provider-directory',
  identifier: trust.code
}
```

**LocalAuthority → Organisation**:
```typescript
{
  name: authority.name,
  domain: new URL(authority.url).hostname,
  category: 'local-government',
  subcategory: `local-authority-${authority.type}`,
  source: 'defra-uk-air',
  identifier: authority.code
}
```

## State Transitions

### Fetch States
1. **IDLE** → Starting state
2. **FETCHING** → HTTP request in progress
3. **PARSING** → HTML parsing in progress
4. **MAPPED** → Data mapped to Organisation model
5. **ERROR** → Failed at any stage

### Error States
- **FETCH_ERROR**: HTTP request failed
- **PARSE_ERROR**: HTML structure unexpected
- **VALIDATION_ERROR**: Data validation failed
- **COUNT_ERROR**: Below minimum threshold

## Aggregation Summary Updates

The existing aggregation summary should be extended:

```typescript
interface AggregationSummary {
  totalOrganisations: number;
  sources: {
    'gov-uk': number;
    'ons-institutional': number;
    'ons-non-institutional': number;
    'nhs-provider-directory': number;  // NEW
    'defra-uk-air': number;            // NEW
  };
  categories: {
    [key: string]: number;
  };
  timestamp: string;
}
```

## Deduplication Rules

1. **Primary deduplication**: By domain (if available)
2. **Secondary deduplication**: By normalized name
3. **NHS Trusts**: Check against existing health category
4. **Local Authorities**: Check against local-government category

**Name normalization**:
- Remove "NHS" prefix/suffix
- Remove "Trust" or "Foundation Trust" suffix
- Remove "Council" suffix
- Convert to lowercase
- Remove special characters
- Compare using Levenshtein distance (threshold: 0.9)