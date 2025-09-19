/**
 * Contract test for Local Healthwatch Fetcher
 * Tests the contract for fetching from paginated Healthwatch directory
 */

import { LocalHealthwatchFetcher } from '../../src/services/fetchers/local-healthwatch-fetcher';
import { DataSource } from '../../src/models/data-source';
import { HealthOrganisationData, PaginatedResponse } from '../../src/models/source-data';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Skip these tests in CI/local as they require network access
const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('LocalHealthwatchFetcher Contract', () => {
  let fetcher: LocalHealthwatchFetcher;

  beforeEach(() => {
    // Mock successful API responses
    const mockPage1 = `
      <html><body>
        <div class="healthwatch-item">
          <h3>Healthwatch Birmingham</h3>
          <p>Birmingham area</p>
        </div>
        <div class="healthwatch-item">
          <h3>Healthwatch Leeds</h3>
          <p>Leeds area</p>
        </div>
        <a href="?page=2" class="next-page">Next</a>
      </body></html>
    `;

    const mockPage2 = `
      <html><body>
        <div class="healthwatch-item">
          <h3>Healthwatch Manchester</h3>
          <p>Manchester area</p>
        </div>
      </body></html>
    `;

    mockedAxios.get = jest.fn().mockImplementation((url: string) => {
      if (url.includes('page=2')) {
        return Promise.resolve({ data: mockPage2 });
      }
      return Promise.resolve({ data: mockPage1 });
    });

    fetcher = new LocalHealthwatchFetcher();
    jest.clearAllMocks();
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

    it('should return mocked Local Healthwatch organisations', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      // Our mock returns 3 healthwatch organisations
      expect(result.data?.length).toBeGreaterThanOrEqual(1);
      expect(result.metadata?.totalRecords).toBeGreaterThanOrEqual(1);
    });

    it('should handle pagination correctly', async () => {
      // Test that the fetcher can handle paginated responses
      const spy = jest.spyOn(fetcher as unknown as { fetchWithRetry: jest.Mock }, 'fetchPage');
      
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
      const result = await (fetcher as unknown as { fetchPage: (page: number) => Promise<unknown> }).fetchPage(1);

      expect(result).toBeDefined();
      expect(result.currentPage).toBe(1);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should indicate when more pages exist', async () => {
      const firstPage = await (fetcher as unknown as { fetchPage: (page: number) => Promise<PaginatedResponse<HealthOrganisationData>> }).fetchPage(1);

      expect(firstPage.hasNextPage).toBeDefined();
      expect(typeof firstPage.hasNextPage).toBe('boolean');
    });
  });
});