/**
 * Simplified Parser Service for actual data structure
 * Handles real GOV.UK API and ONS Excel format
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import { DataSourceType } from '../models/organisation.js';
import type { GovUKOrganisation } from '../models/sources.js';

export interface ParseResult<T = unknown> {
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
  parseGovUkJson(data: string | unknown): ParseResult<GovUKOrganisation> {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errors: [`Failed to parse GOV.UK JSON: ${errorMessage}`],
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
  parseOnsExcel(fileData: string | Buffer): {
    success: boolean;
    data?: {
      institutional: Record<string, unknown>[];
      nonInstitutional: Record<string, unknown>[];
    };
    errors?: string[];
    warnings?: string[];
    metadata?: Record<string, unknown>;
  } {
    try {
      // Handle both file path (for tests) and buffer (for production)
      let workbook: XLSX.WorkBook;
      if (typeof fileData === 'string') {
        // File path - for backward compatibility with tests
        if (!fs.existsSync(fileData)) {
          throw new Error(`File not found: ${fileData}`);
        }
        workbook = XLSX.readFile(fileData);
      } else {
        // Buffer - for production use
        workbook = XLSX.read(fileData, { type: 'buffer' });
      }
      console.log(`ONS Excel has ${workbook.SheetNames.length} sheets`);
      
      // Collect all organizations from relevant sheets
      const allOrganizations: Record<string, unknown>[] = [];
      
      // Sheets that contain organizations
      const orgSheets = [
        'Central Government',
        'Local Government'
      ];
      
      for (const sheetName of orgSheets) {
        if (workbook.SheetNames.includes(sheetName)) {
          console.log(`Processing ONS sheet: ${sheetName}`);
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) {
            console.log(`  Warning: Sheet ${sheetName} not found`);
            continue;
          }
          
          // Get raw data to find where actual data starts
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
          
          // Skip header rows (usually first 4-5 rows are metadata)
          let dataStartRow = -1;
          for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i];
            if (row && row[0] === 'Organisation') {
              dataStartRow = i;
              break;
            }
          }
          
          if (dataStartRow === -1) {
            console.log(`  Warning: Could not find 'Organisation' header in ${sheetName}`);
            continue;
          }
          
          // Extract headers
          const headers = rawData[dataStartRow];
          if (!headers) {
            console.log(`  Warning: No headers found at row ${dataStartRow + 1}`);
            continue;
          }
          console.log(`  Headers found at row ${dataStartRow + 1}:`, headers.slice(0, 5));
          
          // Extract data rows
          let orgCount = 0;
          for (let i = dataStartRow + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row[0]) { // Check if first column (Organisation name) exists
              const orgName = row[0];
              if (typeof orgName === 'string' && orgName.trim().length > 0) {
                const org: Record<string, unknown> = {
                  'Organisation': orgName,
                  '_source_sheet': sheetName
                };
                
                // Add other columns if they exist
                if (row[1]) org['Which is a subsidiary of'] = row[1];
                if (row[2]) org['Which is a subsidiary of (2)'] = row[2];
                if (row[3]) org['Sponsoring Entity'] = row[3];
                if (row[4]) org['Sub Category'] = row[4];
                
                allOrganizations.push(org);
                orgCount++;
              }
            }
          }
          
          console.log(`  Found ${orgCount} organizations in ${sheetName}`);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error parsing ONS Excel:', errorMessage);
      return {
        success: false,
        errors: [`Failed to parse ONS Excel: ${errorMessage}`],
        data: {
          institutional: [],
          nonInstitutional: []
        }
      };
    }
  }
}

export const createSimpleParser = () => new SimpleParserService();