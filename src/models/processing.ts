/**
 * Processing models for UK Public Sector Organisation Aggregator
 * Models for tracking processing, auditing, and conflict resolution
 */

import { DataSourceType, OrganisationType } from './organisation.js';
import type { Organisation } from './organisation.js';

/**
 * Track changes to organisation records over time
 */
export interface AuditRecord {
  id: string;
  organisationId: string;
  timestamp: string;              // ISO datetime
  action: 'created' | 'updated' | 'merged' | 'flagged';
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
}

/**
 * Individual change in an audit record
 */
export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  source: DataSourceType;
}

/**
 * Conflict value from a specific source
 */
export interface ConflictValue {
  source: DataSourceType;
  value: unknown;
  retrievedAt: string;
}

/**
 * Conflict resolution details
 */
export interface ConflictResolution {
  resolvedValue: unknown;
  resolvedBy?: string;
  resolvedAt?: string;
  reason?: string;
}

/**
 * Record conflicts between sources for manual review
 */
export interface DataConflict {
  id: string;
  organisationId: string;
  field: string;
  values: ConflictValue[];
  resolution?: ConflictResolution;
}

/**
 * Source processing metadata
 */
export interface SourceMetadata {
  source: DataSourceType;
  recordCount: number;
  retrievedAt: string;
  errors?: string[];
}

/**
 * Processing statistics
 */
export interface ProcessingStatistics {
  totalOrganisations: number;
  conflictsDetected: number;
  organisationsByType: Record<OrganisationType, number>;
}

/**
 * Processing result metadata
 */
export interface ProcessingMetadata {
  processedAt: string;
  sources: SourceMetadata[];
  statistics: ProcessingStatistics;
}

/**
 * Output of the aggregation process
 */
export interface ProcessingResult {
  organisations: Organisation[];
  metadata: ProcessingMetadata;
  conflicts?: DataConflict[];
  errors?: ProcessingError[];
}

/**
 * Error tracking during processing
 */
export interface ProcessingError {
  source: DataSourceType;
  recordId?: string;
  error: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Batch processing status
 */
export interface BatchProcessingStatus {
  batchId: string;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  errors?: ProcessingError[];
}


/**
 * Validation result for a single record
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

/**
 * Transformation result from source to unified model
 */
export interface TransformationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  unmappedFields?: Record<string, unknown>;
}