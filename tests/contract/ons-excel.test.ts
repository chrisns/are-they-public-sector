/**
 * TDD CONTRACT TEST: ONS Excel Parsing Contract
 * 
 * This test is designed to FAIL initially since the ONSExcelParser service doesn't exist yet.
 * This follows Test-Driven Development (TDD) principles where we write failing tests first
 * that define the contract, then implement the services to make them pass.
 * 
 * Expected failure: Module not found error for '../../src/services/ons-excel-parser.js'
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { ONSExcelParser } from '../../src/services/ons-excel-parser';

describe('ONS Excel Parser Contract Tests', () => {
  let parser: ONSExcelParser;
  
  beforeEach(() => {
    parser = new ONSExcelParser();
  });

  describe('Excel file structure validation', () => {
    test('should validate required sheet names exist', async () => {
      // Mock Excel file path - this would be a real file in integration tests
      const mockExcelFilePath = 'test-data/pscg-sample.xlsx';
      
      const result = await parser.validateSheetStructure(mockExcelFilePath);
      
      expect(result.isValid).toBe(true);
      expect(result.sheets).toContain('Organisation|Institutional Unit');
      expect(result.sheets).toContain('Non-Institutional Units');
    });

    test('should fail when required sheets are missing', async () => {
      const mockExcelFilePath = 'test-data/invalid-pscg.xlsx';
      
      const result = await parser.validateSheetStructure(mockExcelFilePath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required sheet: Organisation|Institutional Unit');
    });
  });

  describe('Institutional Units sheet validation', () => {
    test('should validate required columns in Organisation|Institutional Unit sheet', async () => {
      const mockExcelFilePath = 'test-data/pscg-sample.xlsx';
      const sheetName = 'Organisation|Institutional Unit';
      
      const result = await parser.validateSheetColumns(mockExcelFilePath, sheetName);
      
      expect(result.isValid).toBe(true);
      expect(result.requiredColumns).toEqual(['Organisation name']);
      expect(result.foundColumns).toContain('Organisation name');
    });

    test('should validate optional columns in Organisation|Institutional Unit sheet', async () => {
      const mockExcelFilePath = 'test-data/pscg-sample.xlsx';
      const sheetName = 'Organisation|Institutional Unit';
      
      const result = await parser.validateSheetColumns(mockExcelFilePath, sheetName);
      
      const expectedOptionalColumns = [
        'ONS code',
        'Classification',
        'Parent organisation',
        'Start date',
        'End date'
      ];
      
      // Optional columns should be recognized when present
      expectedOptionalColumns.forEach(column => {
        if (result.foundColumns.includes(column)) {
          expect(result.optionalColumns).toContain(column);
        }
      });
    });

    test('should fail when required columns are missing in Organisation|Institutional Unit sheet', async () => {
      const mockExcelFilePath = 'test-data/invalid-institutional-units.xlsx';
      const sheetName = 'Organisation|Institutional Unit';
      
      const result = await parser.validateSheetColumns(mockExcelFilePath, sheetName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required column: Organisation name');
    });
  });

  describe('Non-Institutional Units sheet validation', () => {
    test('should validate required columns in Non-Institutional Units sheet', async () => {
      const mockExcelFilePath = 'test-data/pscg-sample.xlsx';
      const sheetName = 'Non-Institutional Units';
      
      const result = await parser.validateSheetColumns(mockExcelFilePath, sheetName);
      
      expect(result.isValid).toBe(true);
      expect(result.requiredColumns).toEqual([
        'Non-Institutional Unit name',
        'Sponsoring Entity'
      ]);
      expect(result.foundColumns).toContain('Non-Institutional Unit name');
      expect(result.foundColumns).toContain('Sponsoring Entity');
    });

    test('should validate optional columns in Non-Institutional Units sheet', async () => {
      const mockExcelFilePath = 'test-data/pscg-sample.xlsx';
      const sheetName = 'Non-Institutional Units';
      
      const result = await parser.validateSheetColumns(mockExcelFilePath, sheetName);
      
      const expectedOptionalColumns = [
        'Classification',
        'Status'
      ];
      
      // Optional columns should be recognized when present
      expectedOptionalColumns.forEach(column => {
        if (result.foundColumns.includes(column)) {
          expect(result.optionalColumns).toContain(column);
        }
      });
    });

    test('should fail when required columns are missing in Non-Institutional Units sheet', async () => {
      const mockExcelFilePath = 'test-data/invalid-non-institutional-units.xlsx';
      const sheetName = 'Non-Institutional Units';
      
      const result = await parser.validateSheetColumns(mockExcelFilePath, sheetName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required column: Non-Institutional Unit name');
      expect(result.errors).toContain('Missing required column: Sponsoring Entity');
    });
  });

  describe('Full Excel parsing', () => {
    test('should parse valid Excel file and return structured data', async () => {
      const mockExcelFilePath = 'test-data/pscg-sample.xlsx';
      
      const result = await parser.parseExcel(mockExcelFilePath);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toHaveProperty('institutionalUnits');
      expect(result.data).toHaveProperty('nonInstitutionalUnits');
      expect(Array.isArray(result.data.institutionalUnits)).toBe(true);
      expect(Array.isArray(result.data.nonInstitutionalUnits)).toBe(true);
    });

    test('should return structured institutional units data with required fields', async () => {
      const mockExcelFilePath = 'test-data/pscg-sample.xlsx';
      
      const result = await parser.parseExcel(mockExcelFilePath);
      
      expect(result.isValid).toBe(true);
      
      if (result.data.institutionalUnits.length > 0) {
        const firstUnit = result.data.institutionalUnits[0];
        expect(firstUnit).toHaveProperty('organisationName');
        expect(typeof firstUnit.organisationName).toBe('string');
      }
    });

    test('should return structured non-institutional units data with required fields', async () => {
      const mockExcelFilePath = 'test-data/pscg-sample.xlsx';
      
      const result = await parser.parseExcel(mockExcelFilePath);
      
      expect(result.isValid).toBe(true);
      
      if (result.data.nonInstitutionalUnits.length > 0) {
        const firstUnit = result.data.nonInstitutionalUnits[0];
        expect(firstUnit).toHaveProperty('nonInstitutionalUnitName');
        expect(firstUnit).toHaveProperty('sponsoringEntity');
        expect(typeof firstUnit.nonInstitutionalUnitName).toBe('string');
        expect(typeof firstUnit.sponsoringEntity).toBe('string');
      }
    });

    test('should handle Excel files that match ONS file pattern', async () => {
      // Test file pattern matching as per contract: "pscg*.xlsx"
      const validFileNames = [
        'pscg-2024.xlsx',
        'pscg_current.xlsx',
        'pscgv1.xlsx'
      ];
      
      validFileNames.forEach(fileName => {
        expect(parser.matchesFilePattern(fileName)).toBe(true);
      });
      
      const invalidFileNames = [
        'organisations.xlsx',
        'data.xlsx',
        'pscg.xls',
        'pscg.csv'
      ];
      
      invalidFileNames.forEach(fileName => {
        expect(parser.matchesFilePattern(fileName)).toBe(false);
      });
    });
  });

  describe('Error handling', () => {
    test('should handle non-existent Excel files gracefully', async () => {
      const nonExistentFilePath = 'test-data/does-not-exist.xlsx';
      
      await expect(parser.parseExcel(nonExistentFilePath))
        .rejects.toThrow('Excel file not found');
    });

    test('should handle corrupted Excel files gracefully', async () => {
      const corruptedFilePath = 'test-data/corrupted.xlsx';
      
      const result = await parser.parseExcel(corruptedFilePath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to parse Excel file: File appears to be corrupted');
    });

    test('should handle Excel files with missing expected sheets', async () => {
      const incompleteFilePath = 'test-data/incomplete.xlsx';
      
      const result = await parser.parseExcel(incompleteFilePath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});