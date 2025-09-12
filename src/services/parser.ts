/**
 * Parser Service
 * Handles parsing of JSON and Excel data from various sources
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { 
  isGovUKOrganisation,
  isONSInstitutionalUnit,
  isONSNonInstitutionalUnit
} from '../models/sources.js';
import type { 
  GovUKOrganisation, 
  ONSInstitutionalUnit, 
  ONSNonInstitutionalUnit
} from '../models/sources.js';
import { DataSourceType } from '../models/organisation.js';
import type { TransformationResult } from '../models/processing.js';

/**
 * Configuration for the parser service
 */
export interface ParserConfig {
  validateData?: boolean;
  preserveUnmappedFields?: boolean;
  dateFormat?: string;
}

/**
 * Result of a parse operation
 */
export interface ParseResult<T = any> {
  success: boolean;
  data?: T[];
  errors?: string[] | undefined;
  warnings?: string[] | undefined;
  metadata?: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    source: DataSourceType;
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<ParserConfig> = {
  validateData: true,
  preserveUnmappedFields: true,
  dateFormat: 'DD/MM/YYYY'
};

/**
 * Parser Service
 * Provides methods to parse JSON and Excel data from different sources
 */
export class ParserService {
  private config: Required<ParserConfig>;

  constructor(config: ParserConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Parse JSON data from GOV.UK API
   * @param data Raw JSON data (can be string or object)
   * @returns ParseResult containing array of GovUKOrganisation
   */
  parseGovUkJson(data: string | any): ParseResult<GovUKOrganisation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validOrganisations: GovUKOrganisation[] = [];
    let totalRecords = 0;

    try {
      // Parse JSON if it's a string
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Handle both array and object with results property
      const organisations = Array.isArray(jsonData) ? jsonData : (jsonData.results || []);
      totalRecords = organisations.length;

      for (let i = 0; i < organisations.length; i++) {
        const org = organisations[i];
        
        if (this.config.validateData) {
          if (isGovUKOrganisation(org)) {
            validOrganisations.push(org);
          } else {
            errors.push(`Invalid organisation at index ${i}: missing required fields`);
          }
        } else {
          // Add without validation
          validOrganisations.push(org);
        }

        // Check for potential issues
        if (org.withdrawn) {
          warnings.push(`Organisation "${org.title}" is marked as withdrawn`);
        }
      }

      return {
        success: true,
        data: validOrganisations,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          totalRecords,
          validRecords: validOrganisations.length,
          invalidRecords: totalRecords - validOrganisations.length,
          source: DataSourceType.GOV_UK_API
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse GOV.UK JSON: ${this.formatError(error)}`],
        metadata: {
          totalRecords,
          validRecords: 0,
          invalidRecords: totalRecords,
          source: DataSourceType.GOV_UK_API
        }
      };
    }
  }

  /**
   * Parse Excel file from ONS
   * @param filePath Path to the Excel file
   * @returns ParseResult containing both institutional and non-institutional units
   */
  parseOnsExcel(filePath: string): {
    success: boolean;
    data?: {
      institutional: ONSInstitutionalUnit[];
      nonInstitutional: ONSNonInstitutionalUnit[];
    };
    errors?: string[] | undefined;
    warnings?: string[] | undefined;
    metadata?: {
      totalRecords: number;
      validRecords: number;
      invalidRecords: number;
      source: DataSourceType;
    };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Parse institutional units
      const institutionalResult = this.parseInstitutionalUnits(workbook);
      if (!institutionalResult.success) {
        errors.push(...(institutionalResult.errors || []));
      }
      if (institutionalResult.warnings) {
        warnings.push(...institutionalResult.warnings);
      }

      // Parse non-institutional units
      const nonInstitutionalResult = this.parseNonInstitutionalUnits(workbook);
      if (!nonInstitutionalResult.success) {
        errors.push(...(nonInstitutionalResult.errors || []));
      }
      if (nonInstitutionalResult.warnings) {
        warnings.push(...nonInstitutionalResult.warnings);
      }

      const totalRecords = (institutionalResult.data?.length || 0) + 
                          (nonInstitutionalResult.data?.length || 0);

      return {
        success: errors.length === 0,
        data: {
          institutional: institutionalResult.data || [],
          nonInstitutional: nonInstitutionalResult.data || []
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          totalRecords,
          validRecords: totalRecords - errors.length,
          invalidRecords: errors.length,
          source: DataSourceType.ONS_INSTITUTIONAL
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse ONS Excel: ${this.formatError(error)}`],
        data: {
          institutional: [],
          nonInstitutional: []
        },
        metadata: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          source: DataSourceType.ONS_INSTITUTIONAL
        }
      };
    }
  }

  /**
   * Parse institutional units from ONS Excel workbook
   * @param workbook XLSX workbook object
   * @returns ParseResult containing array of ONSInstitutionalUnit
   */
  private parseInstitutionalUnits(workbook: XLSX.WorkBook): ParseResult<ONSInstitutionalUnit> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validUnits: ONSInstitutionalUnit[] = [];

    try {
      // Find the institutional units sheet
      // It might be named "Organisation|Institutional Unit" or similar
      const sheetName = this.findSheetByPattern(workbook, /institutional|organisation/i);
      
      if (!sheetName) {
        warnings.push('Could not find institutional units sheet');
        return {
          success: true,
          data: [],
          warnings
        };
      }

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        warnings.push('Sheet found but could not be read');
        return {
          success: true,
          data: [],
          warnings
        };
      }
      const jsonData = XLSX.utils.sheet_to_json<any>(sheet, {
        raw: false,
        dateNF: this.config.dateFormat
      });

      for (let i = 0; i < jsonData.length; i++) {
        const row = this.normalizeColumnNames(jsonData[i]);
        
        // Map common variations of column names
        const unit: ONSInstitutionalUnit = {
          'Organisation name': row['organisation name'] || row['name'] || row['organisation'],
          'ONS code': row['ons code'] || row['code'] || row['ons_code'],
          'Classification': row['classification'] || row['type'] || row['category'],
          'Parent organisation': row['parent organisation'] || row['parent'] || row['parent_organisation'],
          'Start date': row['start date'] || row['start_date'] || row['established'],
          'End date': row['end date'] || row['end_date'] || row['dissolved']
        };

        // Preserve unmapped fields if configured
        if (this.config.preserveUnmappedFields) {
          for (const key in row) {
            if (!this.isMappedField(key, ['organisation name', 'ons code', 'classification', 
                                          'parent organisation', 'start date', 'end date'])) {
              unit[key] = row[key];
            }
          }
        }

        if (this.config.validateData) {
          if (isONSInstitutionalUnit(unit)) {
            validUnits.push(unit);
          } else {
            errors.push(`Invalid institutional unit at row ${i + 2}: missing required fields`);
          }
        } else {
          validUnits.push(unit);
        }
      }

      return {
        success: true,
        data: validUnits,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse institutional units: ${this.formatError(error)}`],
        data: []
      };
    }
  }

  /**
   * Parse non-institutional units from ONS Excel workbook
   * @param workbook XLSX workbook object
   * @returns ParseResult containing array of ONSNonInstitutionalUnit
   */
  private parseNonInstitutionalUnits(workbook: XLSX.WorkBook): ParseResult<ONSNonInstitutionalUnit> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validUnits: ONSNonInstitutionalUnit[] = [];

    try {
      // Find the non-institutional units sheet
      const sheetName = this.findSheetByPattern(workbook, /non.?institutional/i);
      
      if (!sheetName) {
        warnings.push('Could not find non-institutional units sheet');
        return {
          success: true,
          data: [],
          warnings
        };
      }

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        warnings.push('Sheet found but could not be read');
        return {
          success: true,
          data: [],
          warnings
        };
      }
      const jsonData = XLSX.utils.sheet_to_json<any>(sheet, {
        raw: false,
        dateNF: this.config.dateFormat
      });

      for (let i = 0; i < jsonData.length; i++) {
        const row = this.normalizeColumnNames(jsonData[i]);
        
        // Map common variations of column names
        const unit: ONSNonInstitutionalUnit = {
          'Non-Institutional Unit name': row['non-institutional unit name'] || row['name'] || row['unit name'],
          'Sponsoring Entity': row['sponsoring entity'] || row['sponsor'] || row['parent'],
          'Classification': row['classification'] || row['type'] || row['category'],
          'Status': row['status'] || row['state']
        };

        // Preserve unmapped fields if configured
        if (this.config.preserveUnmappedFields) {
          for (const key in row) {
            if (!this.isMappedField(key, ['non-institutional unit name', 'sponsoring entity', 
                                          'classification', 'status'])) {
              unit[key] = row[key];
            }
          }
        }

        if (this.config.validateData) {
          if (isONSNonInstitutionalUnit(unit)) {
            validUnits.push(unit);
          } else {
            errors.push(`Invalid non-institutional unit at row ${i + 2}: missing required fields`);
          }
        } else {
          validUnits.push(unit);
        }
      }

      return {
        success: true,
        data: validUnits,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse non-institutional units: ${this.formatError(error)}`],
        data: []
      };
    }
  }

  /**
   * Find sheet name by pattern in workbook
   * @param workbook XLSX workbook
   * @param pattern RegExp pattern to match
   * @returns Sheet name or null
   */
  private findSheetByPattern(workbook: XLSX.WorkBook, pattern: RegExp): string | null {
    for (const sheetName of workbook.SheetNames) {
      if (pattern.test(sheetName)) {
        return sheetName;
      }
    }
    return null;
  }

  /**
   * Normalize column names to lowercase for easier matching
   * @param row Row object with column names as keys
   * @returns Normalized row object
   */
  private normalizeColumnNames(row: any): Record<string, any> {
    const normalized: Record<string, any> = {};
    for (const key in row) {
      normalized[key.toLowerCase().trim()] = row[key];
    }
    return normalized;
  }

  /**
   * Check if a field name is already mapped
   * @param fieldName Field name to check
   * @param mappedFields List of mapped field names
   * @returns True if field is mapped
   */
  private isMappedField(fieldName: string, mappedFields: string[]): boolean {
    const normalized = fieldName.toLowerCase().trim();
    return mappedFields.some(mapped => 
      normalized === mapped.toLowerCase() ||
      normalized.replace(/[_\s-]/g, '') === mapped.toLowerCase().replace(/[_\s-]/g, '')
    );
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
 * Create a default parser instance
 */
export const createParser = (config?: ParserConfig): ParserService => {
  return new ParserService(config);
};