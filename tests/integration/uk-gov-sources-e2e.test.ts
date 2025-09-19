/**
 * End-to-end integration test for UK Government Organisation Data Sources
 * Tests the complete pipeline with mocked HTTP responses
 */

import { EnglishUnitaryAuthoritiesFetcher } from '../../src/services/fetchers/english-unitary-authorities-fetcher';
import { UnitaryAuthorityMapper } from '../../src/services/mappers/unitary-authority-mapper';
import { DataSource } from '../../src/models/data-source';
import { OrganisationType } from '../../src/models/organisation';
import axios from 'axios';

// Mock axios to avoid real HTTP calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UK Government Organisation Data Sources E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('English Unitary Authorities Pipeline', () => {
    it('should fetch, parse, and map English unitary authorities', async () => {
      // Mock the HTML page response
      const mockHtmlResponse = `
        <html>
          <body>
            <a href="/file?uri=/test/unitary_authorities.csv">Download CSV</a>
          </body>
        </html>
      `;

      // Mock the CSV response
      const mockCsvResponse = `Name,Code,Region
Birmingham City Council,E08000025,England
Manchester City Council,E08000003,England
Leeds City Council,E08000035,England`;

      // Setup mocks
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('ons.gov.uk')) {
          return Promise.resolve({ data: mockHtmlResponse });
        }
        if (url.includes('.csv')) {
          return Promise.resolve({ data: mockCsvResponse });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      // Execute the pipeline
      const fetcher = new EnglishUnitaryAuthoritiesFetcher();
      const fetchResult = await fetcher.fetch();

      expect(fetchResult.success).toBe(true);
      expect(fetchResult.data).toBeDefined();
      expect(fetchResult.data!.length).toBe(3);

      // Map the data
      const mapper = new UnitaryAuthorityMapper();
      const organisations = mapper.mapMany(fetchResult.data!, fetchResult.source);

      // Verify the mapping
      expect(organisations).toHaveLength(3);
      expect(organisations[0].name).toBe('Birmingham City Council');
      expect(organisations[0].type).toBe(OrganisationType.UNITARY_AUTHORITY);
      expect(organisations[0].region).toBe('England');
      expect(organisations[0].additionalProperties?.onsCode).toBe('E08000025');
    });
  });

  describe('Complete Pipeline Integration', () => {
    it('should handle multiple data sources in parallel', async () => {
      // Mock responses for multiple sources
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('ons.gov.uk')) {
          return Promise.resolve({
            data: '<a href="/test.csv">CSV</a>'
          });
        }
        if (url.includes('.csv')) {
          return Promise.resolve({
            data: 'Name,Code\nTest Authority,E01'
          });
        }
        if (url.includes('wikipedia')) {
          return Promise.resolve({
            data: '<table><tr><td>Test District</td></tr></table>'
          });
        }
        if (url.includes('nationalparks')) {
          return Promise.resolve({
            data: '<div>Lake District National Park</div>'
          });
        }
        return Promise.resolve({ data: '<html></html>' });
      });

      // Test that we can instantiate all fetchers
      const fetchers = [
        new EnglishUnitaryAuthoritiesFetcher(),
        // Add more fetchers as needed
      ];

      // Execute all fetchers
      const results = await Promise.all(
        fetchers.map(fetcher => fetcher.fetch())
      );

      // All should return some result (success or failure)
      expect(results).toHaveLength(fetchers.length);
      results.forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('source');
        expect(result).toHaveProperty('timestamp');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const fetcher = new EnglishUnitaryAuthoritiesFetcher();
      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle malformed HTML gracefully', async () => {
      mockedAxios.get.mockResolvedValue({ data: 'Not valid HTML' });

      const fetcher = new EnglishUnitaryAuthoritiesFetcher();
      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});