/**
 * Contract for Schools Parser Service
 * This defines the expected interface for the GIAS schools data parser
 */

export interface School {
  urn: number;
  name: string;
  status: string;
  phaseType: string;
  localAuthority: string;
  laestab: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface SchoolsParserOptions {
  searchTerm?: string;        // Search term for API (default: "e")
  delayMs?: number;          // Delay between requests (default: 500)
  maxRetries?: number;       // Max retry attempts (default: 5)
  userAgent?: string;        // User-Agent header
}

export interface FetchPageResult {
  schools: School[];
  hasMore: boolean;
  nextIndex: number;
}

export interface SchoolsParserContract {
  /**
   * Fetch a single page of schools from GIAS API
   * @param startIndex - Starting index for pagination (0-based)
   * @param options - Parser options
   * @returns Page of schools with pagination info
   */
  fetchPage(startIndex: number, options?: SchoolsParserOptions): Promise<FetchPageResult>;

  /**
   * Fetch all schools from GIAS API with pagination
   * @param options - Parser options
   * @returns All open schools
   */
  fetchAll(options?: SchoolsParserOptions): Promise<School[]>;

  /**
   * Transform raw GIAS response to School entities
   * @param rawData - Raw JSON from GIAS API
   * @returns Parsed and validated schools
   */
  parseResponse(rawData: any[]): School[];

  /**
   * Filter schools to only include open establishments
   * @param schools - All schools
   * @returns Only open schools
   */
  filterOpenSchools(schools: School[]): School[];

  /**
   * Deduplicate schools by URN
   * @param schools - Schools potentially with duplicates
   * @returns Unique schools by URN
   */
  deduplicateByUrn(schools: School[]): School[];
}

/**
 * Expected API response format from GIAS
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
 * Error types for contract testing
 */
export class SchoolsParserError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SchoolsParserError';
  }
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  FORMAT_CHANGE_ERROR: 'FORMAT_CHANGE_ERROR'
} as const;