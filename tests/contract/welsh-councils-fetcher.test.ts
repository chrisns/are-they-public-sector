import { WelshCouncilsFetcher } from '../../src/services/fetchers/welsh-councils-fetcher';
import type { WelshCommunityRaw } from '../../src/models/welsh-community';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WelshCouncilsFetcher Contract Tests', () => {
  let fetcher: WelshCouncilsFetcher;
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

    fetcher = new WelshCouncilsFetcher();
    jest.clearAllMocks();
  });

  describe('fetch()', () => {
    it('should return array of WelshCommunityRaw objects', async () => {
      // Mock HTML response matching Wikipedia structure
      const mockHtml = `
        <html>
          <body>
            <h2>Blaenau Gwent</h2>
            <table class="wikitable">
              <tr><th>Community</th><th>Population</th></tr>
              <tr><td>Abertillery</td><td>10,000</td></tr>
              <tr><td>Brynmawr</td><td>5,000</td></tr>
            </table>
            <h2>Cardiff</h2>
            <table class="wikitable">
              <tr><th>Community</th><th>Population</th></tr>
              <tr><td>Cardiff City</td><td>350,000</td></tr>
            </table>
          </body>
        </html>
      `;

      mockAxiosInstance.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify each item conforms to WelshCommunityRaw interface
      result.forEach((council: WelshCommunityRaw) => {
        expect(council).toHaveProperty('name');
        expect(council).toHaveProperty('principalArea');
        expect(typeof council.name).toBe('string');
        expect(typeof council.principalArea).toBe('string');
        expect(council.name.length).toBeGreaterThan(0);
        expect(council.principalArea.length).toBeGreaterThan(0);
      });
    });

    it('should return minimum 400 councils', async () => {
      // Mock large HTML response with multiple councils
      let mockHtml = '<html><body>';
      for (let i = 0; i < 22; i++) {
        mockHtml += `<h2>Area ${i + 1}</h2><table class="wikitable">`;
        for (let j = 0; j < 20; j++) {
          mockHtml += `<tr><td>Council ${i * 20 + j}</td><td>${1000 + j}</td></tr>`;
        }
        mockHtml += '</table>';
      }
      mockHtml += '</body></html>';

      mockAxiosInstance.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(result.length).toBeGreaterThanOrEqual(400);
    });

    it('should verify required fields are present', async () => {
      const mockHtml = `
        <html><body>
          <h2>Test Area</h2>
          <table class="wikitable">
            <tr><td>Test Council</td><td>1000</td><td>http://test.com</td></tr>
          </table>
        </body></html>
      `;

      mockAxiosInstance.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(result.length).toBe(1);
      const council = result[0];

      // Required fields
      expect(council.name).toBeDefined();
      expect(council.principalArea).toBeDefined();
      expect(council.name).toBe('Test Council');
      expect(council.principalArea).toBe('Test Area');
    });

    it('should handle HTTP errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(fetcher.fetch()).rejects.toThrow('Failed to fetch Welsh community councils');
    });

    it('should make correct API call', async () => {
      const mockHtml = '<html><body></body></html>';
      mockAxiosInstance.get.mockResolvedValue({ data: mockHtml });

      await fetcher.fetch().catch(() => {}); // Ignore validation error for empty result

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('wikipedia.org/wiki/List_of_communities_in_Wales'),
        expect.any(Object)
      );
    });
  });
});