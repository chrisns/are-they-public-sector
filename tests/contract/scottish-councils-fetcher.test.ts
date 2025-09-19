import { ScottishCouncilsFetcher } from '../../src/services/fetchers/scottish-councils-fetcher';
import type { ScottishCommunityRaw } from '../../src/services/fetchers/scottish-councils-fetcher';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ScottishCouncilsFetcher Contract Tests', () => {
  let fetcher: ScottishCouncilsFetcher;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create a mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn()
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn(() => mockAxiosInstance);

    fetcher = new ScottishCouncilsFetcher();
    jest.clearAllMocks();
  });

  describe('fetch()', () => {
    it('should return array of ScottishCommunityRaw objects', async () => {
      // Mock HTML response matching Wikipedia structure with asterisks for active councils
      const mockHtml = `
        <html><body>
          <div class="mw-parser-output">
            <div class="mw-heading"><h2>Aberdeen City</h2></div>
            <ol>
              <li>Ashgrove and Stockethill*</li>
              <li>Bridge of Don*</li>
              <li>Dyce and Stoneywood*</li>
            </ol>
            <div class="mw-heading"><h2>Edinburgh</h2></div>
            <ol>
              <li>Leith Community Council*</li>
              <li>Morningside Community Council*</li>
              <li>Tollcross Community Council</li>
            </ol>
          </div>
        </body></html>
      `;

      mockAxiosInstance.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify each item conforms to ScottishCommunityRaw interface
      result.forEach((council: ScottishCommunityRaw) => {
        expect(council).toHaveProperty('name');
        expect(council).toHaveProperty('councilArea');
        expect(council).toHaveProperty('isActive');
        expect(typeof council.name).toBe('string');
        expect(typeof council.councilArea).toBe('string');
        expect(typeof council.isActive).toBe('boolean');
        expect(council.name.length).toBeGreaterThan(0);
        expect(council.councilArea.length).toBeGreaterThan(0);
      });
    });

    it('should filter only active councils', async () => {
      // Mock HTML with mix of active (asterisk) and inactive councils
      const mockHtml = `
        <html><body>
          <div class="mw-parser-output">
            <div class="mw-heading"><h2>Test Area</h2></div>
            <ol>
              <li>Active Council 1*</li>
              <li>Active Council 2*</li>
              <li>Inactive Council</li>
            </ol>
          </div>
        </body></html>
      `;

      mockAxiosInstance.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      // Should include all councils but mark active status appropriately
      expect(result.length).toBe(3);
      const activeCouncils = result.filter(c => c.isActive);
      expect(activeCouncils.length).toBe(2);
    });

    it('should verify required fields are present', async () => {
      const mockHtml = `
        <html><body>
          <div class="mw-parser-output">
            <div class="mw-heading"><h2>Test Area</h2></div>
            <ol><li>Test Council*</li></ol>
          </div>
        </body></html>
      `;

      mockAxiosInstance.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(result.length).toBe(1);
      const council = result[0];

      // Required fields
      expect(council.name).toBeDefined();
      expect(council.councilArea).toBeDefined();
      expect(council.name).toBe('Test Council');
      expect(council.councilArea).toBe('Test Area');
    });

    it('should handle HTTP errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(fetcher.fetch()).rejects.toThrow('Failed to fetch Scottish community councils');
    });

    it('should make correct API call', async () => {
      const mockHtml = '<html><body></body></html>';
      mockAxiosInstance.get.mockResolvedValue({ data: mockHtml });

      await fetcher.fetch().catch(() => {}); // Ignore validation error

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('wikipedia.org/wiki/List_of_community_council_areas_in_Scotland'),
        expect.any(Object)
      );
    });
  });
});