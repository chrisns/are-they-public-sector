/**
 * Data Mapper Service
 * Maps fields from different sources to unified model
 */

import {
  OrganisationType,
  DataSourceType
} from '../models/organisation.js';
import type {
  Organisation,
  DataSourceReference,
  DataQuality,
  DataSourceMapping,
  FieldMapping
} from '../models/organisation.js';
import type {
  GovUKOrganisation,
  ONSInstitutionalUnit,
  ONSNonInstitutionalUnit
} from '../models/sources.js';
import type { TransformationResult } from '../models/processing.js';
import { randomUUID } from 'crypto';
import { mappingConfig } from '../config/mapping-rules.js';

/**
 * Configuration for the mapper service
 */
export interface MapperConfig {
  generateIds?: boolean;
  preserveSourceIds?: boolean;
  defaultConfidence?: number;
  calculateCompleteness?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<MapperConfig> = {
  generateIds: true,
  preserveSourceIds: true,
  defaultConfidence: 0.8,
  calculateCompleteness: true
};

/**
 * Data Mapper Service
 * Transforms data from various sources into the unified Organisation model
 */
export class MapperService {
  private config: Required<MapperConfig>;
  private mappingRules: DataSourceMapping[];

  constructor(config: MapperConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Use mapping rules from configuration file
    this.mappingRules = mappingConfig.mappingRules;
  }

  /**
   * Map GOV.UK organisation data to unified model
   * @param source GOV.UK organisation data
   * @returns TransformationResult containing Organisation
   */
  mapGovUkOrganisation(source: GovUKOrganisation): TransformationResult<Organisation> {
    try {
      const mapping = this.mappingRules.find(m => m.source === DataSourceType.GOV_UK_API);
      if (!mapping) {
        throw new Error('Mapping rules not found for GOV_UK_API');
      }

      const organisation = this.applyMapping(source, mapping);
      
      // Extract parent organisations
      if (source.links?.parent_organisations?.length) {
        organisation.parentOrganisation = source.links.parent_organisations[0].content_id;
      }

      // Set location if available
      if (source.locale) {
        organisation.location = {
          country: this.mapLocale(source.locale)
        };
      }

      // Add source reference
      organisation.sources = [{
        source: DataSourceType.GOV_UK_API,
        sourceId: source.content_id,
        retrievedAt: new Date().toISOString(),
        url: `https://www.gov.uk${source.base_path}`,
        confidence: this.config.defaultConfidence
      }];

      // Calculate data quality
      organisation.dataQuality = this.calculateDataQuality(organisation);

      // Set metadata
      organisation.lastUpdated = source.updated_at || new Date().toISOString();

      // Handle withdrawn status
      if (source.withdrawn) {
        organisation.status = 'dissolved';
      }

      return {
        success: true,
        data: organisation,
        unmappedFields: this.extractUnmappedFields(source, mapping)
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to map GOV.UK organisation: ${this.formatError(error)}`]
      };
    }
  }

  /**
   * Map ONS institutional unit to unified model
   * @param source ONS institutional unit data
   * @returns TransformationResult containing Organisation
   */
  mapOnsInstitutionalUnit(source: ONSInstitutionalUnit): TransformationResult<Organisation> {
    try {
      const mapping = this.mappingRules.find(m => m.source === DataSourceType.ONS_INSTITUTIONAL);
      if (!mapping) {
        throw new Error('Mapping rules not found for ONS_INSTITUTIONAL');
      }

      const organisation = this.applyMapping(source, mapping);

      // Determine organisation type from classification
      organisation.type = this.inferTypeFromClassification(source['Classification']);

      // Add source reference
      organisation.sources = [{
        source: DataSourceType.ONS_INSTITUTIONAL,
        sourceId: source['ONS code'],
        retrievedAt: new Date().toISOString(),
        confidence: this.config.defaultConfidence
      }];

      // Calculate data quality
      organisation.dataQuality = this.calculateDataQuality(organisation);

      // Set metadata
      organisation.lastUpdated = new Date().toISOString();

      // Check if dissolved based on end date
      if (source['End date']) {
        organisation.status = 'dissolved';
      }

      return {
        success: true,
        data: organisation,
        unmappedFields: this.extractUnmappedFields(source, mapping)
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to map ONS institutional unit: ${this.formatError(error)}`]
      };
    }
  }

  /**
   * Map ONS non-institutional unit to unified model
   * @param source ONS non-institutional unit data
   * @returns TransformationResult containing Organisation
   */
  mapOnsNonInstitutionalUnit(source: ONSNonInstitutionalUnit): TransformationResult<Organisation> {
    try {
      const mapping = this.mappingRules.find(m => m.source === DataSourceType.ONS_NON_INSTITUTIONAL);
      if (!mapping) {
        throw new Error('Mapping rules not found for ONS_NON_INSTITUTIONAL');
      }

      const organisation = this.applyMapping(source, mapping);

      // Determine organisation type from classification
      organisation.type = this.inferTypeFromClassification(source['Classification']);

      // Add source reference
      organisation.sources = [{
        source: DataSourceType.ONS_NON_INSTITUTIONAL,
        retrievedAt: new Date().toISOString(),
        confidence: this.config.defaultConfidence
      }];

      // Calculate data quality
      organisation.dataQuality = this.calculateDataQuality(organisation);

      // Set metadata
      organisation.lastUpdated = new Date().toISOString();

      return {
        success: true,
        data: organisation,
        unmappedFields: this.extractUnmappedFields(source, mapping)
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to map ONS non-institutional unit: ${this.formatError(error)}`]
      };
    }
  }

  /**
   * Apply mapping rules to source data
   * @param source Source data object
   * @param mapping Mapping configuration
   * @returns Partially mapped Organisation
   */
  private applyMapping(source: any, mapping: DataSourceMapping): Organisation {
    const result: any = { ...mapping.defaults };

    // Generate or preserve ID
    if (this.config.generateIds) {
      result.id = randomUUID();
    }

    // Apply field mappings
    for (const fieldMapping of mapping.mappings) {
      const value = this.getNestedValue(source, fieldMapping.sourceField);
      
      if (value !== undefined && value !== null && value !== '') {
        const transformedValue = fieldMapping.transformer 
          ? fieldMapping.transformer(value)
          : value;
        
        if (transformedValue !== undefined) {
          result[fieldMapping.targetField] = transformedValue;
        }
      }
    }

    // Ensure required fields have defaults
    if (!result.name) {
      result.name = 'Unknown Organisation';
    }
    if (!result.classification) {
      result.classification = 'unclassified';
    }
    if (!result.type) {
      result.type = OrganisationType.OTHER;
    }
    if (!result.status) {
      result.status = 'active';
    }

    return result as Organisation;
  }

  /**
   * Get nested value from object using dot notation
   * @param obj Source object
   * @param path Property path (e.g., 'details.organisation_govuk_status.status')
   * @returns Value at path or undefined
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Map GOV.UK document type to OrganisationType
   * @param docType GOV.UK document type
   * @returns OrganisationType
   */
  private mapGovUKType(docType: string): OrganisationType {
    return mappingConfig.transformers.mapGovUKType(docType);
  }

  /**
   * Infer organisation type from classification string
   * @param classification Classification string
   * @returns OrganisationType
   */
  private inferTypeFromClassification(classification?: string): OrganisationType {
    return mappingConfig.transformers.inferTypeFromClassification(classification);
  }

  /**
   * Map status string to standard status
   * @param status Raw status string
   * @returns Standard status
   */
  private mapStatus(status?: string): 'active' | 'inactive' | 'dissolved' {
    return mappingConfig.transformers.mapStatus(status);
  }

  /**
   * Map locale to country
   * @param locale Locale string (e.g., 'en-GB')
   * @returns Country name
   */
  private mapLocale(locale: string): string {
    return mappingConfig.transformers.mapLocale(locale);
  }

  /**
   * Parse date string to ISO format
   * @param dateStr Date string in various formats
   * @returns ISO date string or undefined
   */
  private parseDate(dateStr?: string): string | undefined {
    return mappingConfig.transformers.parseDate(dateStr);
  }

  /**
   * Calculate data quality metrics
   * @param org Organisation object
   * @returns DataQuality metrics
   */
  private calculateDataQuality(org: Organisation): DataQuality {
    const fields = [
      'name', 'type', 'classification', 'status',
      'parentOrganisation', 'controllingUnit',
      'establishmentDate', 'dissolutionDate',
      'location', 'alternativeNames'
    ];

    const populatedFields = fields.filter(field => {
      const value = (org as any)[field];
      return value !== undefined && value !== null && value !== '';
    });

    const completeness = populatedFields.length / fields.length;
    const hasConflicts = false; // Will be set by deduplicator
    const requiresReview = completeness < 0.6;
    const reviewReasons = [];

    if (completeness < 0.6) {
      reviewReasons.push('Low data completeness');
    }
    if (!org.classification || org.classification === 'unclassified') {
      reviewReasons.push('Missing classification');
    }

    return {
      completeness,
      hasConflicts,
      requiresReview,
      reviewReasons: reviewReasons.length > 0 ? reviewReasons : undefined
    };
  }

  /**
   * Extract unmapped fields from source data
   * @param source Source data object
   * @param mapping Mapping configuration
   * @returns Unmapped fields
   */
  private extractUnmappedFields(source: any, mapping: DataSourceMapping): Record<string, any> {
    const unmapped: Record<string, any> = {};
    const mappedFields = new Set(mapping.mappings.map(m => m.sourceField));

    const extractFields = (obj: any, prefix = ''): void => {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (!mappedFields.has(fullKey)) {
          const value = obj[key];
          
          if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'object' && !Array.isArray(value)) {
              extractFields(value, fullKey);
            } else {
              unmapped[fullKey] = value;
            }
          }
        }
      }
    };

    extractFields(source);
    return Object.keys(unmapped).length > 0 ? unmapped : {};
  }

  /**
   * Format error message
   * @param error Error object
   * @returns Formatted error message
   */
  private formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

/**
 * Create a default mapper instance
 */
export const createMapper = (config?: MapperConfig): MapperService => {
  return new MapperService(config);
};