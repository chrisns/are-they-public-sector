/**
 * School entity model for UK educational establishments
 * Data sourced from Get Information About Schools (GIAS) service
 */

export interface School {
  /**
   * Unique Reference Number - Government-assigned unique identifier
   */
  urn: number;

  /**
   * School name (mandatory field)
   */
  name: string;

  /**
   * Status of the school - "Open" or "Closed"
   * Only "Open" schools are included in aggregation
   */
  status: string;

  /**
   * Phase and type description
   * e.g., "Primary, Academy converter", "Secondary, Voluntary aided school"
   */
  phaseType: string;

  /**
   * Local authority name
   */
  localAuthority: string;

  /**
   * LA establishment code in format "XXX/XXXX"
   */
  laestab: string;

  /**
   * Full postal address
   */
  address: string;

  /**
   * GPS latitude (nullable for some establishments)
   */
  latitude?: number;

  /**
   * GPS longitude (nullable for some establishments)
   */
  longitude?: number;
}

/**
 * Response from GIAS API
 */
export interface GIASSchoolResponse {
  name: string;
  location: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  address: string;
  urn: number;
  laestab: string;
  status: string;
  localAuthority: string;
  phaseType: string;
}

/**
 * Aggregation metadata
 */
export interface SchoolsMetadata {
  source: string;
  fetchedAt: string;
  totalCount: number;
  openCount: number;
}

/**
 * Complete schools response with metadata
 */
export interface SchoolsResponse {
  schools: School[];
  metadata: SchoolsMetadata;
}

/**
 * Parser options for fetching schools
 */
export interface SchoolsParserOptions {
  searchTerm?: string;        // Search term for API (default: "e")
  delayMs?: number;          // Delay between requests in ms (default: 500)
  maxRetries?: number;       // Max retry attempts (default: 5)
  userAgent?: string;        // User-Agent header for requests
}

/**
 * Result from fetching a single page
 */
export interface FetchPageResult {
  schools: School[];
  hasMore: boolean;
  nextIndex: number;
}

/**
 * Error codes for schools parsing
 */
export enum SchoolsErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  FORMAT_CHANGE_ERROR = 'FORMAT_CHANGE_ERROR'
}

/**
 * Custom error for schools parsing operations
 */
export class SchoolsParserError extends Error {
  constructor(message: string, public code: SchoolsErrorCode) {
    super(message);
    this.name = 'SchoolsParserError';
  }
}