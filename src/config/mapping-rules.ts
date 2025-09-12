/**
 * Mapping Rules Configuration
 * Defines field mappings from various data sources to the unified Organisation model
 * Based on specifications in specs/001-aggregator-of-data/data-model.md
 */

import { 
  DataSourceType, 
  OrganisationType
} from '../models/organisation.js';
import type { 
  DataSourceMapping
} from '../models/organisation.js';

/**
 * Quality thresholds for data validation and deduplication
 */
export const dataQualityThresholds = {
  minCompleteness: 0.6,           // Minimum 60% fields populated
  reviewIfConflicts: true,        // Flag for review if conflicts exist
  duplicateThreshold: 0.9,         // 90% similarity for duplicate detection
  confidenceThreshold: 0.8,        // Default confidence for source data
  exactMatchBoost: 1.0,           // Boost for exact field matches
  fuzzyMatchThreshold: 0.8,       // Threshold for fuzzy string matching
  alternativeNameSimilarity: 0.85 // Similarity threshold for alternative names
};

/**
 * Field weights for similarity scoring
 */
export const fieldWeights = {
  id: 2.0,                         // Highest weight for ID matches
  name: 1.5,                       // High weight for name matches
  alternativeNames: 1.2,           // Moderate-high weight for alt names
  parentOrganisation: 0.8,         // Moderate weight for parent org
  classification: 0.6,             // Lower weight for classification
  type: 0.5,                       // Lower weight for type
  location: 0.3                    // Lowest weight for location
};

/**
 * Conflict resolution priorities by field
 */
export const conflictResolutionPriority = {
  name: ['GOV_UK_API', 'ONS_INSTITUTIONAL', 'ONS_NON_INSTITUTIONAL'],
  type: ['GOV_UK_API', 'ONS_INSTITUTIONAL', 'ONS_NON_INSTITUTIONAL'],
  classification: ['ONS_INSTITUTIONAL', 'ONS_NON_INSTITUTIONAL', 'GOV_UK_API'],
  parentOrganisation: ['GOV_UK_API', 'ONS_INSTITUTIONAL'],
  controllingUnit: ['ONS_NON_INSTITUTIONAL', 'ONS_INSTITUTIONAL'],
  status: ['GOV_UK_API', 'ONS_INSTITUTIONAL', 'ONS_NON_INSTITUTIONAL'],
  establishmentDate: ['ONS_INSTITUTIONAL', 'GOV_UK_API'],
  dissolutionDate: ['ONS_INSTITUTIONAL', 'GOV_UK_API']
};

/**
 * Transform function: Map GOV.UK document type to OrganisationType
 */
export const mapGovUKType = (docType: string): OrganisationType => {
  const typeMap: Record<string, OrganisationType> = {
    'ministerial_department': OrganisationType.MINISTERIAL_DEPARTMENT,
    'non_ministerial_department': OrganisationType.MINISTERIAL_DEPARTMENT,
    'executive_agency': OrganisationType.EXECUTIVE_AGENCY,
    'executive_office': OrganisationType.EXECUTIVE_AGENCY,
    'executive_ndpb': OrganisationType.EXECUTIVE_NDPB,
    'advisory_ndpb': OrganisationType.ADVISORY_NDPB,
    'tribunal_ndpb': OrganisationType.TRIBUNAL_NDPB,
    'tribunal': OrganisationType.TRIBUNAL_NDPB,
    'public_corporation': OrganisationType.PUBLIC_CORPORATION,
    'devolved_administration': OrganisationType.DEVOLVED_ADMINISTRATION,
    'court': OrganisationType.OTHER,
    'civil_service': OrganisationType.OTHER,
    'special_health_authority': OrganisationType.NHS_TRUST,
    'other': OrganisationType.OTHER
  };

  return typeMap[docType?.toLowerCase()] || OrganisationType.OTHER;
};

/**
 * Transform function: Infer organisation type from classification string
 */
export const inferTypeFromClassification = (classification?: string): OrganisationType => {
  if (!classification) {
    return OrganisationType.OTHER;
  }

  const lower = classification.toLowerCase();
  
  // Check for specific patterns
  if (lower.includes('local authority') || lower.includes('council')) {
    return OrganisationType.LOCAL_AUTHORITY;
  }
  if (lower.includes('nhs foundation trust')) {
    return OrganisationType.NHS_FOUNDATION_TRUST;
  }
  if (lower.includes('nhs trust')) {
    return OrganisationType.NHS_TRUST;
  }
  if (lower.includes('executive agency')) {
    return OrganisationType.EXECUTIVE_AGENCY;
  }
  if (lower.includes('ministerial') || lower.includes('department')) {
    return OrganisationType.MINISTERIAL_DEPARTMENT;
  }
  if (lower.includes('executive ndpb') || lower.includes('executive non-departmental')) {
    return OrganisationType.EXECUTIVE_NDPB;
  }
  if (lower.includes('advisory ndpb') || lower.includes('advisory non-departmental')) {
    return OrganisationType.ADVISORY_NDPB;
  }
  if (lower.includes('tribunal')) {
    return OrganisationType.TRIBUNAL_NDPB;
  }
  if (lower.includes('ndpb') || lower.includes('non-departmental')) {
    return OrganisationType.NDPB;
  }
  if (lower.includes('public corporation')) {
    return OrganisationType.PUBLIC_CORPORATION;
  }
  if (lower.includes('devolved')) {
    return OrganisationType.DEVOLVED_ADMINISTRATION;
  }
  
  return OrganisationType.OTHER;
};

/**
 * Transform function: Map status strings to standard status
 */
export const mapStatus = (status?: string): 'active' | 'inactive' | 'dissolved' => {
  if (!status) {
    return 'active';
  }

  const lower = status.toLowerCase();
  
  if (lower.includes('dissolved') || 
      lower.includes('closed') || 
      lower.includes('defunct') || 
      lower.includes('abolished') ||
      lower.includes('merged')) {
    return 'dissolved';
  }
  
  if (lower.includes('inactive') || 
      lower.includes('dormant') || 
      lower.includes('suspended') ||
      lower.includes('exempted')) {
    return 'inactive';
  }
  
  if (lower.includes('active') || 
      lower.includes('live') || 
      lower.includes('open') ||
      lower.includes('operational')) {
    return 'active';
  }
  
  return 'active';
};

/**
 * Transform function: Parse various date formats to ISO format
 */
export const parseDate = (dateStr?: string): string | undefined => {
  if (!dateStr || dateStr.trim() === '') {
    return undefined;
  }

  try {
    // Remove any extra whitespace
    const cleaned = dateStr.trim();
    
    // Try standard parsing first
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try UK format (DD/MM/YYYY)
    const ukMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ukMatch) {
      const [, day, month, year] = ukMatch;
      return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
    }
    
    // Try UK format with dashes (DD-MM-YYYY)
    const ukDashMatch = cleaned.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (ukDashMatch) {
      const [, day, month, year] = ukDashMatch;
      return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
    }
    
    // Try year only
    const yearMatch = cleaned.match(/^(\d{4})$/);
    if (yearMatch) {
      return `${yearMatch[1]}-01-01`;
    }
    
    return undefined;
  } catch {
    return undefined;
  }
};

/**
 * Transform function: Extract acronym as alternative name
 */
export const extractAcronym = (value: string): string[] | undefined => {
  return value ? [value] : undefined;
};

/**
 * Transform function: Map locale to country
 */
export const mapLocale = (locale: string): string => {
  const localeMap: Record<string, string> = {
    'en-gb': 'United Kingdom',
    'en-uk': 'United Kingdom',
    'cy-gb': 'Wales',
    'gd-gb': 'Scotland',
    'en-us': 'United States',
    'en': 'United Kingdom'
  };

  return localeMap[locale.toLowerCase()] || 'United Kingdom';
};

/**
 * Complete mapping rules for all data sources
 */
export const mappingRules: DataSourceMapping[] = [
  {
    // GOV.UK API Mapping
    source: DataSourceType.GOV_UK_API,
    mappings: [
      { 
        sourceField: 'title', 
        targetField: 'name',
        required: true
      },
      { 
        sourceField: 'content_id', 
        targetField: 'id',
        required: true
      },
      { 
        sourceField: 'document_type', 
        targetField: 'type',
        transformer: mapGovUKType,
        required: true
      },
      {
        sourceField: 'details.organisation_govuk_status.status',
        targetField: 'status',
        transformer: mapStatus
      },
      {
        sourceField: 'details.acronym',
        targetField: 'alternativeNames',
        transformer: extractAcronym
      },
      {
        sourceField: 'first_published_at',
        targetField: 'establishmentDate',
        transformer: parseDate
      },
      {
        sourceField: 'withdrawn_notice.withdrawn_at',
        targetField: 'dissolutionDate',
        transformer: parseDate
      }
    ],
    defaults: {
      classification: 'government',
      status: 'active',
      location: {
        country: 'United Kingdom'
      }
    }
  },
  {
    // ONS Institutional Units Mapping
    source: DataSourceType.ONS_INSTITUTIONAL,
    mappings: [
      { 
        sourceField: 'Organisation name', 
        targetField: 'name',
        required: true
      },
      { 
        sourceField: 'ONS code', 
        targetField: 'id'
      },
      { 
        sourceField: 'Classification', 
        targetField: 'classification',
        required: true
      },
      {
        sourceField: 'Classification',
        targetField: 'type',
        transformer: inferTypeFromClassification
      },
      { 
        sourceField: 'Parent organisation', 
        targetField: 'parentOrganisation'
      },
      { 
        sourceField: 'Start date', 
        targetField: 'establishmentDate',
        transformer: parseDate
      },
      {
        sourceField: 'End date',
        targetField: 'dissolutionDate',
        transformer: parseDate
      },
      {
        sourceField: 'Status',
        targetField: 'status',
        transformer: mapStatus
      }
    ],
    defaults: {
      type: OrganisationType.OTHER,
      status: 'active',
      location: {
        country: 'United Kingdom'
      }
    }
  },
  {
    // ONS Non-Institutional Units Mapping
    source: DataSourceType.ONS_NON_INSTITUTIONAL,
    mappings: [
      { 
        sourceField: 'Non-Institutional Unit name', 
        targetField: 'name',
        required: true
      },
      { 
        sourceField: 'Sponsoring Entity', 
        targetField: 'controllingUnit'
      },
      { 
        sourceField: 'Classification', 
        targetField: 'classification'
      },
      {
        sourceField: 'Classification',
        targetField: 'type',
        transformer: inferTypeFromClassification
      },
      {
        sourceField: 'Status',
        targetField: 'status',
        transformer: mapStatus
      }
    ],
    defaults: {
      type: OrganisationType.OTHER,
      status: 'active',
      classification: 'non-institutional',
      location: {
        country: 'United Kingdom'
      }
    }
  }
];

/**
 * Deduplication configuration
 */
export const deduplicationConfig = {
  similarityThreshold: dataQualityThresholds.duplicateThreshold,
  exactMatchFields: ['id', 'content_id', 'ONS code'],
  fuzzyMatchFields: ['name', 'alternativeNames'],
  conflictResolutionStrategy: 'most_complete' as const,
  trackProvenance: true,
  nameNormalization: {
    removeCommonWords: ['the', 'of', 'and', 'for', 'uk', 'british'],
    replacements: {
      '&': 'and',
      'dept': 'department',
      'org': 'organisation',
      'assoc': 'association',
      'comm': 'commission',
      'corp': 'corporation',
      'ltd': 'limited',
      'plc': 'public limited company'
    }
  }
};

/**
 * Validation rules for organisation data
 */
export const validationRules = {
  requiredFields: ['name', 'type', 'status', 'sources'],
  fieldConstraints: {
    name: {
      minLength: 1,
      maxLength: 500
    },
    classification: {
      minLength: 1,
      maxLength: 200
    },
    type: {
      enum: Object.values(OrganisationType)
    },
    status: {
      enum: ['active', 'inactive', 'dissolved']
    }
  },
  dateValidation: {
    establishmentDate: {
      format: 'YYYY-MM-DD',
      maxDate: 'today'
    },
    dissolutionDate: {
      format: 'YYYY-MM-DD',
      maxDate: 'today',
      mustBeAfter: 'establishmentDate'
    }
  }
};

/**
 * Export all configuration
 */
export const mappingConfig = {
  mappingRules,
  qualityThresholds: dataQualityThresholds,
  fieldWeights,
  conflictResolutionPriority,
  deduplicationConfig,
  validationRules,
  transformers: {
    mapGovUKType,
    inferTypeFromClassification,
    mapStatus,
    parseDate,
    extractAcronym,
    mapLocale
  }
};

export default mappingConfig;