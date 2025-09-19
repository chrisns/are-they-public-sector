/**
 * Source-specific data models for UK Government Organisation Data Sources
 */

import { DataSource } from './data-source.js';
import { Region } from './organisation.js';

/**
 * Base response structure for fetcher services
 */
export interface FetcherResponse<T> {
  success: boolean;
  data?: T[];
  error?: string;
  source: DataSource;
  timestamp: Date;
  metadata?: {
    totalRecords?: number;
    pagesProcessed?: number;
    dynamicUrl?: string;
  };
}

/**
 * Paginated response for sources with pagination
 */
export interface PaginatedResponse<T> extends FetcherResponse<T> {
  hasNextPage: boolean;
  currentPage: number;
  totalPages?: number;
}

/**
 * Unitary Authority data from ONS or Law.gov.wales
 */
export interface UnitaryAuthorityData {
  name: string;
  code?: string;        // ONS code if available
  region: 'England' | 'Wales';
}

/**
 * District Council data from Wikipedia
 */
export interface DistrictCouncilData {
  name: string;
  county?: string;      // Parent county
  type?: string;        // Borough, City, District
  population?: number;  // If available from Wikipedia
}

/**
 * Health organisation data (Health Boards, ICBs, Healthwatch)
 */
export interface HealthOrganisationData {
  name: string;
  type: 'health_board' | 'integrated_care_board' | 'local_healthwatch';
  area?: string;        // Geographic coverage
  parentOrg?: string;   // For hierarchical health structures
  website?: string;     // Official website if available
}

/**
 * Transport Partnership data from Scottish sources
 */
export interface TransportPartnershipData {
  name: string;
  abbreviation?: string;  // e.g., SPT, HITRANS
  councils?: string[];    // Member councils
  website?: string;
}

/**
 * Research Council data from UKRI
 */
export interface ResearchCouncilData {
  name: string;
  abbreviation?: string;  // e.g., AHRC, BBSRC
  fullName?: string;
  researchArea?: string;
  website?: string;
}

/**
 * Government Department data from Northern Ireland
 */
export interface GovernmentDepartmentData {
  name: string;
  minister?: string;
  responsibilities?: string[];
  website?: string;
}

/**
 * National Park Authority data
 */
export interface NationalParkData {
  name: string;
  established?: string;  // Year established
  area?: string;         // Geographic area
  website?: string;
}

/**
 * Trust Port data from Northern Ireland
 */
export interface TrustPortData {
  name: string;
  location?: string;
  type?: string;        // Commercial, Trust, etc.
  website?: string;
}

/**
 * Generic organisation data for simpler sources
 */
export interface GenericOrganisationData {
  name: string;
  type?: string;
  region?: Region;
  website?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Union type for all source data types
 */
export type SourceData =
  | UnitaryAuthorityData
  | DistrictCouncilData
  | HealthOrganisationData
  | TransportPartnershipData
  | ResearchCouncilData
  | GovernmentDepartmentData
  | NationalParkData
  | TrustPortData
  | GenericOrganisationData;

/**
 * Mapper input type
 */
export type MapperInput = SourceData;

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMs: [1000, 2000, 4000]
};

/**
 * Fetcher error structure
 */
export interface FetcherError {
  success: false;
  error: string;
  source: DataSource;
  timestamp: Date;
  retryAttempts?: number;
  lastError?: Error;
}