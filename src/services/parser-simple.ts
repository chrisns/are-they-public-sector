/**
 * Simplified Parser Service for actual data structure
 * Handles real GOV.UK API and ONS Excel format
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import { DataSourceType } from '../models/organisation.js';
import type { GovUKOrganisation, ONSInstitutionalUnit, ONSNonInstitutionalUnit } from '../models/sources.js';

export interface ParseResult<T = any> {
  success: boolean;
  data?: T[];
  errors?: string[];
  warnings?: string[];
  metadata?: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    source: DataSourceType;
  };
}

export class SimpleParserService {
  /**
   * Parse GOV.UK API JSON response
   */
  parseGovUkJson(data: string | any): ParseResult<GovUKOrganisation> {
    try {
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
      const organisations = Array.isArray(jsonData) ? jsonData : (jsonData.results || []);
      
      console.log(`Parsed ${organisations.length} GOV.UK organisations`);
      
      return {
        success: true,
        data: organisations,
        metadata: {
          totalRecords: organisations.length,
          validRecords: organisations.length,
          invalidRecords: 0,
          source: DataSourceType.GOV_UK_API
        }
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [`Failed to parse GOV.UK JSON: ${error.message}`],
        data: [],
        metadata: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          source: DataSourceType.GOV_UK_API
        }
      };
    }
  }

  /**
   * Parse ONS Excel file - simplified for actual structure
   */
  parseOnsExcel(filePath: string): {
    success: boolean;
    data?: {
      institutional: any[];
      nonInstitutional: any[];
    };
    errors?: string[];
    warnings?: string[];
    metadata?: any;
  } {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const workbook = XLSX.readFile(filePath);
      console.log(`ONS Excel has ${workbook.SheetNames.length} sheets`);
      
      // Collect all organizations from relevant sheets
      const allOrganizations: any[] = [];
      
      // Sheets that contain organizations
      const orgSheets = [
        'Central Government',
        'Local Government',
        'Public Corporations',
        'ValidationLists',
        'Index'
      ];
      
      for (const sheetName of orgSheets) {
        if (workbook.SheetNames.includes(sheetName)) {
          console.log(`Processing ONS sheet: ${sheetName}`);
          const sheet = workbook.Sheets[sheetName];
          
          // Convert to JSON - this will give us all the data
          const jsonData = XLSX.utils.sheet_to_json(sheet, { 
            raw: false,
            defval: null
          });
          
          console.log(`  Found ${jsonData.length} rows in ${sheetName}`);
          
          // Add source info to each record
          jsonData.forEach((row: any) => {
            if (row && Object.keys(row).length > 0) {
              row._source_sheet = sheetName;
              allOrganizations.push(row);
            }
          });
        }
      }
      
      console.log(`Total ONS organizations found: ${allOrganizations.length}`);
      
      // For now, treat all as institutional units
      // The actual structure doesn't match the expected model
      return {
        success: true,
        data: {
          institutional: allOrganizations,
          nonInstitutional: []
        },
        metadata: {
          totalRecords: allOrganizations.length,
          validRecords: allOrganizations.length,
          invalidRecords: 0,
          source: DataSourceType.ONS_INSTITUTIONAL
        }
      };
    } catch (error: any) {
      console.error('Error parsing ONS Excel:', error.message);
      return {
        success: false,
        errors: [`Failed to parse ONS Excel: ${error.message}`],
        data: {
          institutional: [],
          nonInstitutional: []
        }
      };
    }
  }
}

export const createSimpleParser = () => new SimpleParserService();