/**
 * Unit tests for SimpleParserService
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SimpleParserService } from '../../src/services/parser-simple';
import { DataSourceType } from '../../src/models/organisation';

describe('SimpleParserService', () => {
  let parser: SimpleParserService;

  beforeEach(() => {
    parser = new SimpleParserService();
  });

  describe('parseGovUkJson', () => {
    test('should parse valid GOV.UK data', () => {
      const mockData = [
        {
          title: 'Test Org 1',
          slug: 'test-org-1',
          format: 'Ministerial department'
        },
        {
          title: 'Test Org 2',
          slug: 'test-org-2',
          format: 'Executive agency'
        }
      ];

      const result = parser.parseGovUkJson(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.metadata?.totalRecords).toBe(2);
      expect(result.metadata?.source).toBe(DataSourceType.GOV_UK_API);
    });

    test('should handle string input', () => {
      const mockData = JSON.stringify([{ title: 'Test', slug: 'test' }]);
      
      const result = parser.parseGovUkJson(mockData);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('should handle results wrapper', () => {
      const mockData = {
        results: [{ title: 'Test', slug: 'test' }]
      };
      
      const result = parser.parseGovUkJson(mockData);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('should handle invalid JSON', () => {
      const result = parser.parseGovUkJson('invalid json');
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.data).toEqual([]);
    });

    test('should handle empty data', () => {
      const result = parser.parseGovUkJson([]);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.metadata?.totalRecords).toBe(0);
    });
  });
});