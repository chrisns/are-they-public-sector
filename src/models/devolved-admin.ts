/**
 * Devolved Administration entity model for UK devolved governments
 * Covers Scotland, Wales, and Northern Ireland government structures
 */

export interface DevolvedAdmin {
  /**
   * Unique identifier for the entity
   */
  id: string;

  /**
   * Official name of the entity
   */
  name: string;

  /**
   * Type of governmental entity
   */
  type: DevolvedAdminType;

  /**
   * Which devolved administration this belongs to
   */
  administration: DevolvedNation;

  /**
   * Parent entity ID if this is a sub-organisation
   */
  parentId?: string;

  /**
   * Official website URL
   */
  website?: string;

  /**
   * Date established (ISO format)
   */
  established?: string;

  /**
   * Current minister or head
   */
  minister?: string;

  /**
   * Key responsibilities or policy areas
   */
  responsibilities?: string[];

  /**
   * Alternative names or abbreviations
   */
  alternativeNames?: string[];
}

/**
 * Types of devolved administration entities
 */
export enum DevolvedAdminType {
  PARLIAMENT = 'parliament',
  GOVERNMENT = 'government',
  DEPARTMENT = 'department',
  DIRECTORATE = 'directorate',
  AGENCY = 'agency',
  PUBLIC_BODY = 'public_body'
}

/**
 * Devolved nations of the UK
 */
export enum DevolvedNation {
  SCOTLAND = 'scotland',
  WALES = 'wales',
  NORTHERN_IRELAND = 'northern_ireland'
}

/**
 * Response from devolved admin aggregation
 */
export interface DevolvedAdminResponse {
  entities: DevolvedAdmin[];
  metadata: DevolvedAdminMetadata;
}

/**
 * Metadata for devolved admin aggregation
 */
export interface DevolvedAdminMetadata {
  source: string;
  fetchedAt: string;
  totalCount: number;
  byAdministration: {
    scotland: number;
    wales: number;
    northern_ireland: number;
  };
  byType: Record<string, number>;
}

/**
 * Parser options for devolved admin data
 */
export interface DevolvedAdminParserOptions {
  includeAgencies?: boolean;
  includePublicBodies?: boolean;
}

/**
 * Error codes for devolved admin parsing
 */
export enum DevolvedAdminErrorCode {
  DATA_LOAD_ERROR = 'DATA_LOAD_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * Custom error for devolved admin operations
 */
export class DevolvedAdminError extends Error {
  constructor(message: string, public code: DevolvedAdminErrorCode) {
    super(message);
    this.name = 'DevolvedAdminError';
  }
}