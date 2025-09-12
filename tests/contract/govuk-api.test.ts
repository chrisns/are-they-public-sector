/**
 * CONTRACT TEST: GOV.UK API Response Contract
 * 
 * Verifies the GOV.UK API returns the expected number of organizations
 * and that the data structure matches our expectations.
 * 
 * Current actual count: 1235 organizations (may vary as API data changes)
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { createFetcher } from '../../src/services/fetcher';
import { createSimpleParser } from '../../src/services/parser-simple';

describe('GOV.UK API Contract Tests', () => {
  let fetcher: ReturnType<typeof createFetcher>;
  let parser: ReturnType<typeof createSimpleParser>;

  beforeAll(() => {
    fetcher = createFetcher();
    parser = createSimpleParser();
  });

  test('should fetch and parse GOV.UK organisations successfully', async () => {
    // Mock the fetch to avoid actual API calls in tests
    const mockData = {
      results: [
        {
          title: 'Test Department',
          slug: 'test-dept',
          content_id: '12345',
          base_path: '/government/organisations/test-dept',
          format: 'Ministerial department',
          details: {},
          links: {}
        }
      ]
    };

    // For actual contract testing against real API (disabled by default)
    if (process.env.TEST_REAL_API === 'true') {
      const response = await fetcher.fetchGovUkOrganisations();
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      
      // We expect around 1235 organizations
      expect(response.data.length).toBeGreaterThan(1200);
      expect(response.data.length).toBeLessThan(1300);
      
      // Test structure of first organization
      if (response.data.length > 0) {
        const firstOrg = response.data[0];
        expect(firstOrg).toHaveProperty('title');
        expect(firstOrg).toHaveProperty('slug');
      }
    } else {
      // Use mock data for unit tests
      const parseResult = parser.parseGovUkJson(mockData);
      
      expect(parseResult.success).toBe(true);
      expect(parseResult.data).toHaveLength(1);
      expect(parseResult.data![0]).toHaveProperty('title');
    }
  }, 30000);

  test('should handle API errors gracefully', () => {
    const errorResult = parser.parseGovUkJson('invalid data');
    
    expect(errorResult.success).toBe(false);
    expect(errorResult.errors).toBeDefined();
    expect(errorResult.data).toEqual([]);
  });
});