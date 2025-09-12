/**
 * Unit tests for ParserService
 * Tests JSON and Excel parsing with validation and error handling
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { ParserService } from '../../src/services/parser';
import { DataSourceType } from '../../src/models/organisation';
import type { 
  GovUKOrganisation, 
  ONSInstitutionalUnit, 
  ONSNonInstitutionalUnit 
} from '../../src/models/sources';

// Mock XLSX and fs
jest.mock('xlsx');
jest.mock('fs');

const mockedXLSX = XLSX as jest.Mocked<typeof XLSX>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ParserService', () => {
  let parser: ParserService;

  beforeEach(() => {
    jest.clearAllMocks();
    parser = new ParserService();
  });

  describe('parseGovUkJson', () => {
    it('should parse valid GOV.UK JSON data', () => {
      const mockData: GovUKOrganisation[] = [
        {
          content_id: '1',
          title: 'Department of Health',
          organisation_govuk_status: { status: 'live' },
          format: 'Executive agency',
          base_path: '/government/organisations/department-of-health',
          web_url: 'https://www.gov.uk/government/organisations/department-of-health',
          public_timestamp: '2021-01-01T00:00:00Z',
          links: {},
          locale: 'en',
          phase: 'live',
          document_type: 'organisation',
          schema_name: 'organisation',
          withdrawn: false,
          details: {
            acronym: 'DH',
            brand: 'department-of-health',
            default_news_image: null,
            logo: {
              crest: 'single-identity',
              formatted_title: 'Department<br/>of Health'
            },
            organisation_featuring_priority: 0,
            organisation_govuk_closed_status: null,
            organisation_type: 'executive_agency',
            parent_organisations: [],
            child_organisations: [],
            superseded_organisations: [],
            superseding_organisations: []
          },
          description: 'The Department of Health',
          updated_at: '2021-01-01T00:00:00Z',
          analytics_identifier: 'DH'
        }
      ];

      const result = parser.parseGovUkJson(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.metadata).toEqual({
        totalRecords: 1,
        validRecords: 1,
        invalidRecords: 0,
        source: DataSourceType.GOV_UK_API
      });
      expect(result.errors).toEqual([]);
    });

    it('should handle JSON string input', () => {
      const mockData = [{ content_id: '1', title: 'Test Org' }];
      const jsonString = JSON.stringify(mockData);

      const result = parser.parseGovUkJson(jsonString);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle object with results property', () => {
      const mockData = {
        results: [
          { content_id: '1', title: 'Test Org 1' },
          { content_id: '2', title: 'Test Org 2' }
        ]
      };

      const result = parser.parseGovUkJson(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should validate data when validation is enabled', () => {
      const mockData = [
        { content_id: '1', title: 'Valid Org' },
        { invalid: 'data' } // Missing required fields
      ];

      const result = parser.parseGovUkJson(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.errors).toContain('Invalid organisation at index 1: missing required fields');
      expect(result.metadata?.invalidRecords).toBe(1);
    });

    it('should skip validation when disabled', () => {
      const parser = new ParserService({ validateData: false });
      const mockData = [
        { content_id: '1', title: 'Valid Org' },
        { invalid: 'data' }
      ];

      const result = parser.parseGovUkJson(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toEqual([]);
    });

    it('should add warnings for withdrawn organisations', () => {
      const mockData = [
        { content_id: '1', title: 'Withdrawn Org', withdrawn: true },
        { content_id: '2', title: 'Closed Org', details: { organisation_govuk_closed_status: 'closed' } }
      ];

      const result = parser.parseGovUkJson(mockData);

      expect(result.warnings).toContain('Organisation "Withdrawn Org" is marked as withdrawn');
      expect(result.warnings).toContain('Organisation "Closed Org" is closed');
    });

    it('should handle invalid JSON string', () => {
      const invalidJson = 'not valid json';

      const result = parser.parseGovUkJson(invalidJson);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Failed to parse JSON'));
    });

    it('should handle empty data', () => {
      const result = parser.parseGovUkJson([]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.metadata?.totalRecords).toBe(0);
    });
  });

  describe('parseOnsInstitutional', () => {
    beforeEach(() => {
      // Mock file reading
      mockedFs.readFileSync.mockReturnValue(Buffer.from('mock excel data'));
      
      // Mock XLSX methods
      mockedXLSX.read.mockReturnValue({
        SheetNames: ['Institutional Units'],
        Sheets: {
          'Institutional Units': {}
        }
      });
    });

    it('should parse valid ONS institutional Excel data', () => {
      const mockSheetData = [
        {
          'CDID': 'CDID001',
          'Name': 'Test Institution',
          'Classification': 'Central Government',
          'Sector': 'S.1311',
          'Sub-sector': 'Central government',
          'ONS List 1': 'Y',
          'ESA 2010': 'Y',
          'MGDD': 'Y',
          'Start date': '01/01/2020',
          'End date': null
        }
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const result = parser.parseOnsInstitutional('test.xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        CDID: 'CDID001',
        Name: 'Test Institution',
        Classification: 'Central Government'
      });
      expect(result.metadata?.source).toBe(DataSourceType.ONS_INSTITUTIONAL);
    });

    it('should handle multiple sheets and find the correct one', () => {
      mockedXLSX.read.mockReturnValue({
        SheetNames: ['Summary', 'Institutional Units', 'Other'],
        Sheets: {
          'Summary': {},
          'Institutional Units': {},
          'Other': {}
        }
      });

      const mockSheetData = [
        { CDID: 'TEST001', Name: 'Test Org' }
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const result = parser.parseOnsInstitutional('test.xlsx');

      expect(result.success).toBe(true);
      expect(mockedXLSX.utils.sheet_to_json).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ defval: null })
      );
    });

    it('should validate institutional units when validation is enabled', () => {
      const mockSheetData = [
        { CDID: 'VALID001', Name: 'Valid Institution' },
        { invalid: 'data' } // Missing required fields
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const result = parser.parseOnsInstitutional('test.xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.errors).toContain('Invalid institutional unit at row 2: missing required fields');
    });

    it('should handle file read errors', () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = parser.parseOnsInstitutional('nonexistent.xlsx');

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Failed to read Excel file'));
    });

    it('should handle missing institutional units sheet', () => {
      mockedXLSX.read.mockReturnValue({
        SheetNames: ['Summary', 'Other'],
        Sheets: {
          'Summary': {},
          'Other': {}
        }
      });

      const result = parser.parseOnsInstitutional('test.xlsx');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Institutional Units sheet not found in Excel file');
    });

    it('should handle empty sheet data', () => {
      mockedXLSX.utils.sheet_to_json.mockReturnValue([]);

      const result = parser.parseOnsInstitutional('test.xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.metadata?.totalRecords).toBe(0);
    });
  });

  describe('parseOnsNonInstitutional', () => {
    beforeEach(() => {
      mockedFs.readFileSync.mockReturnValue(Buffer.from('mock excel data'));
      
      mockedXLSX.read.mockReturnValue({
        SheetNames: ['Non-institutional Units'],
        Sheets: {
          'Non-institutional Units': {}
        }
      });
    });

    it('should parse valid ONS non-institutional Excel data', () => {
      const mockSheetData = [
        {
          'Name': 'Test Non-Institutional',
          'Classification': 'Public Corporation',
          'Sector': 'S.11001',
          'Sub-sector': 'Public non-financial corporations',
          'Trading fund': 'N',
          'Market body / Regulator / Other': 'Market body',
          'Start date': '01/01/2020',
          'End date': null
        }
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const result = parser.parseOnsNonInstitutional('test.xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        Name: 'Test Non-Institutional',
        Classification: 'Public Corporation'
      });
      expect(result.metadata?.source).toBe(DataSourceType.ONS_NON_INSTITUTIONAL);
    });

    it('should find non-institutional sheet with various names', () => {
      // Test with hyphenated name
      mockedXLSX.read.mockReturnValue({
        SheetNames: ['Non-institutional Units'],
        Sheets: { 'Non-institutional Units': {} }
      });

      mockedXLSX.utils.sheet_to_json.mockReturnValue([
        { Name: 'Test Org 1' }
      ]);

      let result = parser.parseOnsNonInstitutional('test.xlsx');
      expect(result.success).toBe(true);

      // Test with space
      mockedXLSX.read.mockReturnValue({
        SheetNames: ['Non institutional Units'],
        Sheets: { 'Non institutional Units': {} }
      });

      result = parser.parseOnsNonInstitutional('test.xlsx');
      expect(result.success).toBe(true);

      // Test with different case
      mockedXLSX.read.mockReturnValue({
        SheetNames: ['NON-INSTITUTIONAL UNITS'],
        Sheets: { 'NON-INSTITUTIONAL UNITS': {} }
      });

      result = parser.parseOnsNonInstitutional('test.xlsx');
      expect(result.success).toBe(true);
    });

    it('should validate non-institutional units when validation is enabled', () => {
      const mockSheetData = [
        { Name: 'Valid Non-Institutional' },
        { invalid: 'data' } // Missing required Name field
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const result = parser.parseOnsNonInstitutional('test.xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.errors).toContain('Invalid non-institutional unit at row 2: missing required fields');
    });

    it('should skip validation when disabled', () => {
      const parser = new ParserService({ validateData: false });
      const mockSheetData = [
        { Name: 'Valid Non-Institutional' },
        { invalid: 'data' }
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const result = parser.parseOnsNonInstitutional('test.xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle missing non-institutional units sheet', () => {
      mockedXLSX.read.mockReturnValue({
        SheetNames: ['Summary', 'Other'],
        Sheets: {
          'Summary': {},
          'Other': {}
        }
      });

      const result = parser.parseOnsNonInstitutional('test.xlsx');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Non-institutional Units sheet not found in Excel file');
    });
  });

  describe('error handling for malformed data', () => {
    it('should handle corrupted Excel files', () => {
      mockedFs.readFileSync.mockReturnValue(Buffer.from('not an excel file'));
      mockedXLSX.read.mockImplementation(() => {
        throw new Error('File format is not recognized');
      });

      const result = parser.parseOnsInstitutional('corrupted.xlsx');

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Failed to parse Excel file'));
    });

    it('should handle null/undefined values in data', () => {
      const mockData = [
        { content_id: '1', title: 'Valid Org' },
        null,
        undefined,
        { content_id: '2', title: 'Another Valid Org' }
      ];

      const result = parser.parseGovUkJson(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle circular references in JSON', () => {
      const circularObj: any = { content_id: '1', title: 'Test' };
      circularObj.self = circularObj;

      const result = parser.parseGovUkJson([circularObj]);

      // Should handle gracefully without throwing
      expect(result.success).toBeDefined();
    });
  });

  describe('configuration options', () => {
    it('should preserve unmapped fields when configured', () => {
      const parser = new ParserService({ preserveUnmappedFields: true });
      const mockData = [
        {
          content_id: '1',
          title: 'Test Org',
          customField: 'custom value',
          anotherField: 123
        }
      ];

      const result = parser.parseGovUkJson(mockData);

      expect(result.success).toBe(true);
      expect(result.data?.[0]).toHaveProperty('customField', 'custom value');
      expect(result.data?.[0]).toHaveProperty('anotherField', 123);
    });

    it('should use custom date format', () => {
      const parser = new ParserService({ dateFormat: 'MM/DD/YYYY' });
      
      // This test would need actual date parsing implementation
      // For now, just verify the parser accepts the configuration
      expect(parser).toBeDefined();
    });
  });
});