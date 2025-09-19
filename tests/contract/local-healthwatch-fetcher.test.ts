/**
 * Contract test for Local Healthwatch Fetcher
 * Tests the contract for fetching from paginated Healthwatch directory
 */

import { LocalHealthwatchFetcher } from '../../src/services/fetchers/local-healthwatch-fetcher';
import { DataSource } from '../../src/models/data-source';
import { HealthOrganisationData, PaginatedResponse } from '../../src/models/source-data';

describe('LocalHealthwatchFetcher Contract', () => {
  let fetcher: LocalHealthwatchFetcher;

  beforeEach(() => {
    fetcher = new LocalHealthwatchFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.HEALTHWATCH);
    });

    it('should successfully fetch and paginate through all pages', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.metadata?.pagesProcessed).toBeGreaterThan(0);
    });

    it('should return valid Local Healthwatch objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstHealthwatch = result.data![0] as HealthOrganisationData;

      expect(firstHealthwatch.name).toBeDefined();
      expect(typeof firstHealthwatch.name).toBe('string');
      expect(firstHealthwatch.type).toBe('local_healthwatch');
    });

    it('should return approximately 150 Local Healthwatch organisations', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      // England has approximately 150 Local Healthwatch organisations
      expect(result.data?.length).toBeGreaterThan(140);
      expect(result.data?.length).toBeLessThan(160);
      expect(result.metadata?.totalRecords).toBeGreaterThan(140);
    });

    it('should handle pagination correctly', async () => {
      // Test that the fetcher can handle paginated responses
      const spy = jest.spyOn(fetcher as any, 'fetchPage');
      
      await fetcher.fetch();

      // Should have been called multiple times for pagination
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls.length).toBeGreaterThan(1);
    });

    it('should include area/location information', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const orgs = result.data as HealthOrganisationData[];
      const withArea = orgs.filter(o => o.area);

      expect(withArea.length).toBeGreaterThan(0);
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.healthwatch.co.uk/your-local-healthwatch/list');
      expect(fetcher.source).toBe(DataSource.HEALTHWATCH);
    });
  });

  describe('fetchPage', () => {
    it('should fetch individual pages', async () => {
      const result = await (fetcher as any).fetchPage(1);

      expect(result).toBeDefined();
      expect(result.currentPage).toBe(1);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should indicate when more pages exist', async () => {
      const firstPage = await (fetcher as any).fetchPage(1) as PaginatedResponse<HealthOrganisationData>;

      expect(firstPage.hasNextPage).toBeDefined();
      expect(typeof firstPage.hasNextPage).toBe('boolean');
    });
  });
});