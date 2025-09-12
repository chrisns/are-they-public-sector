# Data Model: UK Public Sector Organisation Aggregator

## Core Entities

### Organisation
Primary entity representing a UK public sector organisation after aggregation and deduplication.

```typescript
interface Organisation {
  // Unique identifier (generated)
  id: string;
  
  // Core fields (mapped from sources)
  name: string;
  alternativeNames?: string[];
  type: OrganisationType;
  classification: string;
  
  // Hierarchical relationships
  parentOrganisation?: string;  // ID reference
  controllingUnit?: string;      // From "Sponsoring Entity"
  
  // Status and lifecycle
  status: 'active' | 'inactive' | 'dissolved';
  establishmentDate?: string;    // ISO date
  dissolutionDate?: string;      // ISO date
  
  // Location
  location?: {
    address?: string;
    region?: string;
    country: string;
  };
  
  // Source tracking
  sources: DataSourceReference[];
  
  // Metadata
  lastUpdated: string;           // ISO datetime
  dataQuality: DataQuality;
  
  // Unmapped fields preservation
  additionalProperties?: Record<string, any>;
}
```

### OrganisationType
Enumeration of public sector organisation types.

```typescript
enum OrganisationType {
  MINISTERIAL_DEPARTMENT = 'ministerial_department',
  EXECUTIVE_AGENCY = 'executive_agency',
  LOCAL_AUTHORITY = 'local_authority',
  NHS_TRUST = 'nhs_trust',
  NHS_FOUNDATION_TRUST = 'nhs_foundation_trust',
  NDPB = 'non_departmental_public_body',
  EXECUTIVE_NDPB = 'executive_ndpb',
  ADVISORY_NDPB = 'advisory_ndpb',
  TRIBUNAL_NDPB = 'tribunal_ndpb',
  PUBLIC_CORPORATION = 'public_corporation',
  DEVOLVED_ADMINISTRATION = 'devolved_administration',
  OTHER = 'other'
}
```

### DataSourceReference
Tracks which sources contributed to an organisation record.

```typescript
interface DataSourceReference {
  source: DataSourceType;
  sourceId?: string;              // Original ID in source system
  retrievedAt: string;            // ISO datetime
  url?: string;                   // Source URL if applicable
  confidence: number;             // 0-1 confidence score
}
```

### DataSourceType
Enumeration of data sources.

```typescript
enum DataSourceType {
  GOV_UK_API = 'gov_uk_api',
  ONS_INSTITUTIONAL = 'ons_institutional_unit',
  ONS_NON_INSTITUTIONAL = 'ons_non_institutional_unit'
}
```

### DataQuality
Metadata about data completeness and reliability.

```typescript
interface DataQuality {
  completeness: number;           // 0-1 score
  hasConflicts: boolean;
  conflictFields?: string[];
  requiresReview: boolean;
  reviewReasons?: string[];
}
```

## Source-Specific Models

### GovUKOrganisation
Raw structure from GOV.UK API.

```typescript
interface GovUKOrganisation {
  analytics_identifier?: string;
  base_path: string;
  content_id: string;
  description?: string;
  details?: {
    acronym?: string;
    brand?: string;
    default_news_image?: any;
    logo?: {
      formatted_title?: string;
      crest?: string;
    };
    organisation_govuk_status?: {
      status?: string;
      updated_at?: string;
    };
  };
  document_type: string;
  first_published_at?: string;
  links?: {
    parent_organisations?: Array<{
      analytics_identifier?: string;
      api_path?: string;
      base_path?: string;
      content_id?: string;
      title?: string;
    }>;
    child_organisations?: Array<any>;
  };
  locale?: string;
  phase?: string;
  public_updated_at?: string;
  schema_name?: string;
  title: string;
  updated_at?: string;
  withdrawn?: boolean;
}
```

### ONSInstitutionalUnit
Structure from ONS Excel "Organisation|Institutional Unit" tab.

```typescript
interface ONSInstitutionalUnit {
  'Organisation name': string;
  'ONS code'?: string;
  'Classification': string;
  'Parent organisation'?: string;
  'Start date'?: string;
  'End date'?: string;
  [key: string]: any;  // Preserve unmapped columns
}
```

### ONSNonInstitutionalUnit
Structure from ONS Excel "Non-Institutional Units" tab.

```typescript
interface ONSNonInstitutionalUnit {
  'Non-Institutional Unit name': string;
  'Sponsoring Entity': string;
  'Classification'?: string;
  'Status'?: string;
  [key: string]: any;  // Preserve unmapped columns
}
```

## Mapping Configuration

### FieldMapping
Configuration for mapping source fields to unified model.

```typescript
interface FieldMapping {
  sourceField: string;
  targetField: keyof Organisation;
  transformer?: (value: any) => any;
  required?: boolean;
}

interface DataSourceMapping {
  source: DataSourceType;
  mappings: FieldMapping[];
  defaults?: Partial<Organisation>;
}
```

### Mapping Rules
```typescript
const mappingRules: DataSourceMapping[] = [
  {
    source: DataSourceType.GOV_UK_API,
    mappings: [
      { sourceField: 'title', targetField: 'name' },
      { sourceField: 'content_id', targetField: 'id' },
      { sourceField: 'document_type', targetField: 'type', transformer: mapGovUKType },
      { sourceField: 'details.organisation_govuk_status.status', targetField: 'status' }
    ]
  },
  {
    source: DataSourceType.ONS_INSTITUTIONAL,
    mappings: [
      { sourceField: 'Organisation name', targetField: 'name' },
      { sourceField: 'Classification', targetField: 'classification' },
      { sourceField: 'Parent organisation', targetField: 'parentOrganisation' }
    ]
  },
  {
    source: DataSourceType.ONS_NON_INSTITUTIONAL,
    mappings: [
      { sourceField: 'Non-Institutional Unit name', targetField: 'name' },
      { sourceField: 'Sponsoring Entity', targetField: 'controllingUnit' },
      { sourceField: 'Classification', targetField: 'classification' }
    ]
  }
];
```

## Processing Models

### AuditRecord
Track changes to organisation records over time.

```typescript
interface AuditRecord {
  id: string;
  organisationId: string;
  timestamp: string;              // ISO datetime
  action: 'created' | 'updated' | 'merged' | 'flagged';
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
    source: DataSourceType;
  }[];
  metadata?: Record<string, any>;
}
```

### DataConflict
Record conflicts between sources for manual review.

```typescript
interface DataConflict {
  id: string;
  organisationId: string;
  field: string;
  values: {
    source: DataSourceType;
    value: any;
    retrievedAt: string;
  }[];
  resolution?: {
    resolvedValue: any;
    resolvedBy?: string;
    resolvedAt?: string;
    reason?: string;
  };
}
```

### ProcessingResult
Output of the aggregation process.

```typescript
interface ProcessingResult {
  organisations: Organisation[];
  metadata: {
    processedAt: string;
    sources: {
      source: DataSourceType;
      recordCount: number;
      retrievedAt: string;
      errors?: string[];
    }[];
    statistics: {
      totalOrganisations: number;
      duplicatesFound: number;
      conflictsDetected: number;
      organisationsByType: Record<OrganisationType, number>;
    };
  };
  conflicts?: DataConflict[];
  errors?: ProcessingError[];
}
```

### ProcessingError
Error tracking during processing.

```typescript
interface ProcessingError {
  source: DataSourceType;
  recordId?: string;
  error: string;
  context?: Record<string, any>;
  timestamp: string;
}
```

## Validation Rules

### Organisation Validation
```typescript
const organisationValidation = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 500
  },
  type: {
    required: true,
    enum: Object.values(OrganisationType)
  },
  status: {
    required: true,
    enum: ['active', 'inactive', 'dissolved']
  },
  sources: {
    required: true,
    minItems: 1
  }
};
```

### Data Quality Thresholds
```typescript
const qualityThresholds = {
  minCompleteness: 0.6,         // Minimum 60% fields populated
  reviewIfConflicts: true,      // Flag for review if conflicts exist
  duplicateThreshold: 0.9        // 90% similarity for duplicate detection
};
```