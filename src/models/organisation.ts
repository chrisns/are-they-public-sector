/**
 * Core data models for UK Public Sector Organisation Aggregator
 * Organisation model and related interfaces
 */

/**
 * Enumeration of public sector organisation types
 */
export enum OrganisationType {
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

/**
 * Enumeration of data sources
 */
export enum DataSourceType {
  GOV_UK_API = 'gov_uk_api',
  ONS_INSTITUTIONAL = 'ons_institutional_unit',
  ONS_NON_INSTITUTIONAL = 'ons_non_institutional_unit'
}

/**
 * Tracks which sources contributed to an organisation record
 */
export interface DataSourceReference {
  source: DataSourceType;
  sourceId?: string;              // Original ID in source system
  retrievedAt: string;            // ISO datetime
  url?: string;                   // Source URL if applicable
  confidence: number;             // 0-1 confidence score
}

/**
 * Metadata about data completeness and reliability
 */
export interface DataQuality {
  completeness: number;           // 0-1 score
  hasConflicts: boolean;
  conflictFields?: string[];
  requiresReview: boolean;
  reviewReasons?: string[];
}

/**
 * Location information for an organisation
 */
export interface OrganisationLocation {
  address?: string;
  region?: string;
  country: string;
}

/**
 * Primary entity representing a UK public sector organisation after aggregation and deduplication
 */
export interface Organisation {
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
  location?: OrganisationLocation;
  
  // Source tracking
  sources: DataSourceReference[];
  
  // Metadata
  lastUpdated: string;           // ISO datetime
  dataQuality: DataQuality;
  
  // Unmapped fields preservation
  additionalProperties?: Record<string, any>;
}

/**
 * Configuration for mapping source fields to unified model
 */
export interface FieldMapping {
  sourceField: string;
  targetField: keyof Organisation;
  transformer?: (value: any) => any;
  required?: boolean;
}

/**
 * Data source mapping configuration
 */
export interface DataSourceMapping {
  source: DataSourceType;
  mappings: FieldMapping[];
  defaults?: Partial<Organisation>;
}

/**
 * Organisation validation rules
 */
export const organisationValidation = {
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
    enum: ['active', 'inactive', 'dissolved'] as const
  },
  sources: {
    required: true,
    minItems: 1
  }
};

/**
 * Data quality thresholds
 */
export const qualityThresholds = {
  minCompleteness: 0.6,         // Minimum 60% fields populated
  reviewIfConflicts: true,      // Flag for review if conflicts exist
  duplicateThreshold: 0.9        // 90% similarity for duplicate detection
};