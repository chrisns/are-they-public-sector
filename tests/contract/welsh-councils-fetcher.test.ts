import { WelshCouncilsFetcher } from '../../src/services/fetchers/welsh-councils-fetcher';
import type { WelshCommunityRaw } from '../../src/models/welsh-community';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WelshCouncilsFetcher Contract Tests', () => {
  let fetcher: WelshCouncilsFetcher;

  beforeEach(() => {
    fetcher = new WelshCouncilsFetcher();
    jest.clearAllMocks();
  });

  describe('fetch()', () => {
    it('should return array of WelshCommunityRaw objects', async () => {
      // Mock response with sample Welsh council data
      const mockResponse = {
        data: {
          results: [
            {
              name: 'Abertillery Town Council',
              principalArea: 'Blaenau Gwent',
              ward: 'Abertillery',
              type: 'Town Council',
              website: 'http://example.com',
              email: 'contact@example.com'
            },
            {
              name: 'Cardiff City Council',
              principalArea: 'Cardiff',
              ward: 'City Centre',
              type: 'City Council',
              website: 'http://cardiff.gov.uk',
              email: 'info@cardiff.gov.uk'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

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

    it('should return minimum 1000 councils', async () => {
      // Mock large dataset response
      const mockCouncils = Array.from({ length: 1200 }, (_, i) => ({
        name: `Council ${i + 1}`,
        principalArea: `Area ${Math.floor(i / 50) + 1}`,
        ward: `Ward ${i % 10}`,
        type: 'Community Council'
      }));

      mockedAxios.get.mockResolvedValue({
        data: { results: mockCouncils }
      });

      const result = await fetcher.fetch();

      expect(result.length).toBeGreaterThanOrEqual(1000);
    });

    it('should verify required fields are present', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              name: 'Test Council',
              principalArea: 'Test Area',
              ward: 'Test Ward',
              type: 'Community Council',
              website: 'http://test.com'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

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

      await expect(fetcher.fetch()).rejects.toThrow('Network error');
    });

    it('should make correct API call', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { results: [] }
      });

      await fetcher.fetch();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('wales.gov.uk'),
        expect.any(Object)
      );
    });
  });
});