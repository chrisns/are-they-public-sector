/**
 * Configuration exports for UK Public Sector Organisation Aggregator
 */

export { 
  mappingConfig,
  dataQualityThresholds,
  fieldWeights,
  conflictResolutionPriority,
  deduplicationConfig,
  validationRules,
  mapGovUKType,
  inferTypeFromClassification,
  mapStatus,
  parseDate,
  extractAcronym,
  mapLocale,
  mappingRules
} from './mapping-rules.js';

export type { default as MappingConfig } from './mapping-rules.js';