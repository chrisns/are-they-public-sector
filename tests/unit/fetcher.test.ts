/**
 * Unit tests for FetcherService
 * Tests HTTP fetching, retry logic, and error handling
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { FetcherService, createFetcher } from '../../src/services/fetcher';
import { DataSourceType } from '../../src/models/organisation';

// Mock axios and fs
jest.mock('axios');
jest.mock('fs');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FetcherService', () => {
  let fetcher: FetcherService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return a mock instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    
    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);
  });

  describe('fetchGovUkOrganisations', () => {
    beforeEach(() => {
      fetcher = new FetcherService();
    });

    it('should successfully fetch organisations from GOV.UK API', async () => {
      const mockOrganisations = [
        { content_id: '1', name: 'Org 1' },
        { content_id: '2', name: 'Org 2' }
      ];

      // Mock first page response
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          results: mockOrganisations,
          links: { next: null }
        }
      });

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrganisations);
      expect(result.source).toBe(DataSourceType.GOV_UK_API);
      expect(result.retrievedAt).toBeDefined();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'https://www.gov.uk/api/organisations'
      );
    });

    it('should handle paginated results from GOV.UK API', async () => {
      const mockPage1 = [
        { content_id: '1', name: 'Org 1' },
        { content_id: '2', name: 'Org 2' }
      ];
      const mockPage2 = [
        { content_id: '3', name: 'Org 3' },
        { content_id: '4', name: 'Org 4' }
      ];

      // Mock first page with next link
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          results: mockPage1,
          links: { next: 'https://www.gov.uk/api/organisations?page=2' }
        }
      });

      // Mock second page without next link
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          results: mockPage2,
          links: { next: null }
        }
      });

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([...mockPage1, ...mockPage2]);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockAxiosInstance.get.mockRejectedValue(new Error(errorMessage));

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.source).toBe(DataSourceType.GOV_UK_API);
    });

    it('should handle empty results', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          results: [],
          links: { next: null }
        }
      });

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('scrapeOnsExcelLink', () => {
    it('should find Excel link with exact text match', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/file?uri=/methodology/classifications/pscgaug2025.xlsx">Public sector classification guide</a>
          </body>
        </html>
      `;

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockHtml
      });

      const result = await fetcher.scrapeOnsExcelLink();

      expect(result).toBe('https://www.ons.gov.uk/file?uri=/methodology/classifications/pscgaug2025.xlsx');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'https://www.ons.gov.uk/economy/nationalaccounts/uksectoraccounts/datasets/publicsectorclassificationguide',
        { responseType: 'text' }
      );
    });

    it('should find Excel link with fallback pattern', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/downloads/classification_guide.xlsx">Download classification</a>
          </body>
        </html>
      `;

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockHtml
      });

      const result = await fetcher.scrapeOnsExcelLink();

      expect(result).toBe('https://www.ons.gov.uk/downloads/classification_guide.xlsx');
    });

    it('should find any Excel file as last resort', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/downloads/data.xlsx">Download data</a>
          </body>
        </html>
      `;

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockHtml
      });

      const result = await fetcher.scrapeOnsExcelLink();

      expect(result).toBe('https://www.ons.gov.uk/downloads/data.xlsx');
    });

    it('should return null when no Excel links found', async () => {
      const mockHtml = `
        <html>
          <body>
            <p>No downloads available</p>
          </body>
        </html>
      `;

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockHtml
      });

      const result = await fetcher.scrapeOnsExcelLink();

      expect(result).toBeNull();
    });

    it('should handle scraping errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await fetcher.scrapeOnsExcelLink();

      expect(result).toBeNull();
    });
  });

  describe('downloadOnsExcel', () => {
    beforeEach(() => {
      // Mock fs methods
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.mkdirSync.mockImplementation(() => undefined);
      mockedFs.writeFileSync.mockImplementation(() => undefined);
    });

    it('should download Excel file from provided URL', async () => {
      const mockExcelData = Buffer.from('mock excel data');
      const mockUrl = 'https://www.ons.gov.uk/file.xlsx';
      const outputPath = '/test/output.xlsx';

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockExcelData
      });

      const result = await fetcher.downloadOnsExcel(mockUrl, outputPath);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        filePath: outputPath,
        url: mockUrl
      });
      expect(result.source).toBe(DataSourceType.ONS_INSTITUTIONAL);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(outputPath, mockExcelData);
    });

    it('should scrape URL if not provided', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/file.xlsx">Public sector classification guide</a>
          </body>
        </html>
      `;
      const mockExcelData = Buffer.from('mock excel data');

      // Mock scraping
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockHtml
      });

      // Mock download
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockExcelData
      });

      const result = await fetcher.downloadOnsExcel();

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe('https://www.ons.gov.uk/file.xlsx');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should create directory if it does not exist', async () => {
      const mockExcelData = Buffer.from('mock excel data');
      const mockUrl = 'https://www.ons.gov.uk/file.xlsx';
      const outputPath = '/test/new/dir/output.xlsx';

      mockedFs.existsSync.mockReturnValue(false);
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockExcelData
      });

      const result = await fetcher.downloadOnsExcel(mockUrl, outputPath);

      expect(result.success).toBe(true);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        path.dirname(outputPath),
        { recursive: true }
      );
    });

    it('should handle download errors', async () => {
      const mockUrl = 'https://www.ons.gov.uk/file.xlsx';
      const errorMessage = 'Download failed';

      mockAxiosInstance.get.mockRejectedValue(new Error(errorMessage));

      const result = await fetcher.downloadOnsExcel(mockUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.source).toBe(DataSourceType.ONS_INSTITUTIONAL);
    });

    it('should handle case when Excel URL cannot be found', async () => {
      // Mock scraping to return null
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: '<html><body>No links</body></html>'
      });

      const result = await fetcher.downloadOnsExcel();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not find Excel file URL on ONS page');
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      const mockData = { results: [], links: { next: null } };

      // Fail twice, then succeed
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockData });

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors except 429', async () => {
      const error404 = new Error('Not found');
      (error404 as any).response = { status: 404 };

      mockAxiosInstance.get.mockRejectedValue(error404);

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(false);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 (rate limit) errors', async () => {
      const error429 = new Error('Too many requests');
      (error429 as any).response = { status: 429 };
      const mockData = { results: [], links: { next: null } };

      mockAxiosInstance.get
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: mockData });

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx errors', async () => {
      const error500 = new Error('Internal server error');
      (error500 as any).response = { status: 500 };
      const mockData = { results: [], links: { next: null } };

      mockAxiosInstance.get
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce({ data: mockData });

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const fetcher = new FetcherService({ maxRetries: 2, retryDelay: 10 });
      const error = new Error('Network error');

      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('error formatting', () => {
    it('should format Axios errors with response', async () => {
      const axiosError = new Error('Request failed');
      (axiosError as any).response = {
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.error).toBe('HTTP 500: Internal Server Error');
    });

    it('should format Axios errors without response', async () => {
      const axiosError = new Error('Network timeout');
      (axiosError as any).request = {};
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.error).toBe('No response received from server');
    });

    it('should format generic errors', async () => {
      const error = new Error('Generic error');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.error).toBe('Generic error');
    });

    it('should format non-Error objects', async () => {
      mockAxiosInstance.get.mockRejectedValue('String error');

      const result = await fetcher.fetchGovUkOrganisations();

      expect(result.error).toBe('String error');
    });
  });

  describe('createFetcher factory', () => {
    it('should create fetcher instance with default config', () => {
      const fetcher = createFetcher();
      expect(fetcher).toBeInstanceOf(FetcherService);
    });

    it('should create fetcher instance with custom config', () => {
      const fetcher = createFetcher({
        maxRetries: 5,
        timeout: 60000
      });
      expect(fetcher).toBeInstanceOf(FetcherService);
    });
  });
});